import json
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Domain, Capability, SubCapability, ChecklistItem,
    AuditLog, AuditAction, ChecklistStatus, User
)
from app.schemas.capability import ProgressSummary


def _status_value(status):
    """Get the string value from a status field (handles both Enum objects and raw strings)."""
    if status is None:
        return None
    if isinstance(status, str):
        return status
    return status.value


class CapabilityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_progress(self, checklist_query) -> ProgressSummary:
        items = (await self.db.execute(checklist_query)).scalars().all()
        total = len(items)
        completed = sum(1 for i in items if i.status == ChecklistStatus.COMPLETE)
        not_started = sum(1 for i in items if i.status == ChecklistStatus.NOT_STARTED)
        in_progress = sum(1 for i in items if i.status == ChecklistStatus.IN_PROGRESS)
        blocked = sum(1 for i in items if i.status == ChecklistStatus.BLOCKED)
        na = sum(1 for i in items if i.status == ChecklistStatus.NOT_APPLICABLE)

        denominator = total - na
        pct = (completed / denominator * 100) if denominator > 0 else 0.0

        now = datetime.now(timezone.utc)
        overdue = sum(1 for i in items if i.due_date and i.due_date < now and i.status != ChecklistStatus.COMPLETE)

        return ProgressSummary(
            total_items=total,
            completed_items=completed,
            not_started=not_started,
            in_progress=in_progress,
            blocked=blocked,
            not_applicable=na,
            completion_pct=round(pct, 1),
            overdue_items=overdue,
        )

    # --- Checklist Item CRUD ---

    async def create_checklist_item(self, sub_capability_id: str, org_id: str, data: dict) -> ChecklistItem:
        item = ChecklistItem(
            title=data["title"],
            description=data.get("description"),
            owner=data.get("owner"),
            due_date=data.get("due_date"),
            notes=data.get("notes"),
            sub_capability_id=str(sub_capability_id),
            organization_id=str(org_id),
        )
        self.db.add(item)
        await self.db.flush()

        await self._log_audit(org_id, str(data.get("user_id", "")), AuditAction.CREATE, "checklist_item", item.id)
        return item

    async def update_checklist_item(self, item_id: str, org_id: str, data: dict, user_id: str) -> Optional[ChecklistItem]:
        result = await self.db.execute(
            select(ChecklistItem).where(
                and_(ChecklistItem.id == str(item_id), ChecklistItem.organization_id == str(org_id))
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            return None

        old_status = _status_value(item.status)

        for key, value in data.items():
            if key == "status" and value is not None:
                item.status = value
            elif value is not None:
                setattr(item, key, value)

        item.last_updated_by = str(user_id)
        item.updated_at = datetime.now(timezone.utc)
        await self.db.flush()

        new_status = _status_value(item.status)
        action = AuditAction.STATUS_CHANGE if (old_status and new_status and old_status != new_status) else AuditAction.UPDATE
        changes = {"old_status": old_status, "new_status": new_status}
        await self._log_audit(org_id, str(user_id), action, "checklist_item", item.id, changes=json.dumps(changes))
        return item

    async def delete_checklist_item(self, item_id: str, org_id: str) -> bool:
        result = await self.db.execute(
            select(ChecklistItem).where(
                and_(ChecklistItem.id == str(item_id), ChecklistItem.organization_id == str(org_id))
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            return False
        await self.db.delete(item)
        await self.db.flush()
        return True

    async def get_checklist_items(self, sub_capability_id: str) -> List[ChecklistItem]:
        result = await self.db.execute(
            select(ChecklistItem)
            .where(ChecklistItem.sub_capability_id == str(sub_capability_id))
            .order_by(ChecklistItem.display_order, ChecklistItem.created_at)
        )
        return result.scalars().all()

    async def get_checklist_item(self, item_id: str, org_id: str) -> Optional[ChecklistItem]:
        result = await self.db.execute(
            select(ChecklistItem).where(
                and_(ChecklistItem.id == str(item_id), ChecklistItem.organization_id == str(org_id))
            )
        )
        return result.scalar_one_or_none()

    # --- Aggregation ---

    async def get_sub_capability_progress(self, sub_cap_id: str) -> ProgressSummary:
        return await self._get_progress(
            select(ChecklistItem).where(ChecklistItem.sub_capability_id == str(sub_cap_id))
        )

    async def get_capability_progress(self, capability_id: str) -> ProgressSummary:
        result = await self.db.execute(
            select(SubCapability.id).where(SubCapability.capability_id == str(capability_id))
        )
        sub_ids = [str(r[0]) for r in result.all()]
        if not sub_ids:
            return ProgressSummary()
        return await self._get_progress(
            select(ChecklistItem).where(ChecklistItem.sub_capability_id.in_(sub_ids))
        )

    async def get_domain_progress(self, domain_id: str) -> ProgressSummary:
        result = await self.db.execute(
            select(Capability.id).where(Capability.domain_id == str(domain_id))
        )
        cap_ids = [str(r[0]) for r in result.all()]
        if not cap_ids:
            return ProgressSummary()
        result2 = await self.db.execute(
            select(SubCapability.id).where(SubCapability.capability_id.in_(cap_ids))
        )
        sub_ids = [str(r[0]) for r in result2.all()]
        if not sub_ids:
            return ProgressSummary()
        return await self._get_progress(
            select(ChecklistItem).where(ChecklistItem.sub_capability_id.in_(sub_ids))
        )

    async def get_org_progress(self, org_id: str) -> ProgressSummary:
        return await self._get_progress(
            select(ChecklistItem).where(ChecklistItem.organization_id == str(org_id))
        )

    async def get_dashboard(self, org_id: str) -> dict:
        domains = await self.get_domains(org_id)
        overall = await self.get_org_progress(org_id)

        domain_responses = []
        for domain in domains:
            progress = await self.get_domain_progress(domain.id)
            caps = await self.get_capabilities(domain.id)
            completed_caps = 0
            for cap in caps:
                cap_progress = await self.get_capability_progress(cap.id)
                if cap_progress.completion_pct >= 100:
                    completed_caps += 1

            domain_responses.append({
                "id": str(domain.id),
                "name": domain.name,
                "slug": domain.slug,
                "description": domain.description,
                "display_order": domain.display_order,
                "accent_color": domain.accent_color,
                "icon_name": domain.icon_name,
                "capability_count": len(caps),
                "completed_capabilities": completed_caps,
                "progress": progress,
            })

        return {
            "overall_completion_pct": overall.completion_pct,
            "total_completed_items": overall.completed_items,
            "total_items": overall.total_items,
            "in_progress_items": overall.in_progress,
            "overdue_items": overall.overdue_items,
            "domains": domain_responses,
        }

    async def get_domain_detail(self, domain_id: str, org_id: str) -> Optional[dict]:
        result = await self.db.execute(
            select(Domain).where(and_(Domain.id == str(domain_id), Domain.organization_id == str(org_id)))
        )
        domain = result.scalar_one_or_none()
        if not domain:
            return None

        caps = await self.get_capabilities(domain.id)
        cap_responses = []
        for cap in caps:
            progress = await self.get_capability_progress(cap.id)
            subs = await self.get_sub_capabilities(cap.id)
            completed_subs = 0
            for s in subs:
                sp = await self.get_sub_capability_progress(s.id)
                if sp.completion_pct >= 100:
                    completed_subs += 1

            cap_responses.append({
                "id": str(cap.id),
                "name": cap.name,
                "slug": cap.slug,
                "description": cap.description,
                "display_order": cap.display_order,
                "domain_id": str(cap.domain_id),
                "sub_capability_count": len(subs),
                "completed_sub_capabilities": completed_subs,
                "progress": progress,
            })

        return {
            "id": str(domain.id),
            "name": domain.name,
            "slug": domain.slug,
            "description": domain.description,
            "display_order": domain.display_order,
            "accent_color": domain.accent_color,
            "icon_name": domain.icon_name,
            "capability_count": len(cap_responses),
            "completed_capabilities": sum(1 for c in cap_responses if c["progress"].completion_pct >= 100),
            "progress": await self.get_domain_progress(domain.id),
            "capabilities": cap_responses,
        }

    async def get_capability_detail(self, capability_id: str, org_id: str) -> Optional[dict]:
        result = await self.db.execute(
            select(Capability).where(and_(Capability.id == str(capability_id), Capability.organization_id == str(org_id)))
        )
        cap = result.scalar_one_or_none()
        if not cap:
            return None

        subs = await self.get_sub_capabilities(cap.id)
        sub_responses = []
        for sub in subs:
            progress = await self.get_sub_capability_progress(sub.id)
            items = await self.get_checklist_items(sub.id)
            sub_responses.append({
                "id": str(sub.id),
                "name": sub.name,
                "slug": sub.slug,
                "description": sub.description,
                "display_order": sub.display_order,
                "capability_id": str(sub.capability_id),
                "progress": progress,
                "checklist_items": [{
                    "id": str(i.id),
                    "title": i.title,
                    "description": i.description,
                    "status": _status_value(i.status),
                    "owner": i.owner,
                    "due_date": i.due_date,
                    "notes": i.notes,
                    "evidence_url": i.evidence_url,
                    "display_order": i.display_order,
                    "sub_capability_id": str(i.sub_capability_id),
                    "assigned_to": str(i.assigned_to) if i.assigned_to else None,
                    "last_updated_by": str(i.last_updated_by) if i.last_updated_by else None,
                    "created_at": i.created_at,
                    "updated_at": i.updated_at,
                } for i in items],
            })

        progress = await self.get_capability_progress(cap.id)
        return {
            "id": str(cap.id),
            "name": cap.name,
            "slug": cap.slug,
            "description": cap.description,
            "display_order": cap.display_order,
            "domain_id": str(cap.domain_id),
            "sub_capability_count": len(subs),
            "completed_sub_capabilities": sum(1 for s in sub_responses if s["progress"].completion_pct >= 100),
            "progress": progress,
            "sub_capabilities": sub_responses,
        }

    async def get_sub_capability_detail(self, sub_capability_id: str, org_id: str) -> Optional[dict]:
        result = await self.db.execute(
            select(SubCapability).where(
                and_(SubCapability.id == str(sub_capability_id), SubCapability.organization_id == str(org_id))
            )
        )
        sub = result.scalar_one_or_none()
        if not sub:
            return None

        items = await self.get_checklist_items(sub.id)
        progress = await self.get_sub_capability_progress(sub.id)

        return {
            "id": str(sub.id),
            "name": sub.name,
            "slug": sub.slug,
            "description": sub.description,
            "display_order": sub.display_order,
            "capability_id": str(sub.capability_id),
            "progress": progress,
            "checklist_items": [{
                "id": str(i.id),
                "title": i.title,
                "description": i.description,
                "status": _status_value(i.status),
                "owner": i.owner,
                "due_date": i.due_date,
                "notes": i.notes,
                "evidence_url": i.evidence_url,
                "display_order": i.display_order,
                "sub_capability_id": str(i.sub_capability_id),
                "assigned_to": str(i.assigned_to) if i.assigned_to else None,
                "last_updated_by": str(i.last_updated_by) if i.last_updated_by else None,
                "created_at": i.created_at,
                "updated_at": i.updated_at,
            } for i in items],
        }

    async def get_domains(self, org_id: str) -> List[Domain]:
        result = await self.db.execute(
            select(Domain)
            .where(Domain.organization_id == str(org_id))
            .order_by(Domain.display_order)
        )
        return result.scalars().all()

    async def get_capabilities(self, domain_id: str) -> List[Capability]:
        result = await self.db.execute(
            select(Capability)
            .where(Capability.domain_id == str(domain_id))
            .order_by(Capability.display_order)
        )
        return result.scalars().all()

    async def get_sub_capabilities(self, capability_id: str) -> List[SubCapability]:
        result = await self.db.execute(
            select(SubCapability)
            .where(SubCapability.capability_id == str(capability_id))
            .order_by(SubCapability.display_order)
        )
        return result.scalars().all()

    async def search(self, org_id: str, query: str) -> List[dict]:
        q = f"%{query}%"
        results = []

        result = await self.db.execute(
            select(Domain).where(
                and_(Domain.organization_id == str(org_id), Domain.name.ilike(q))
            ).limit(10)
        )
        for d in result.scalars().all():
            results.append({"type": "domain", "id": str(d.id), "title": d.name, "description": d.description, "parent_path": d.name, "status": None})

        result = await self.db.execute(
            select(Capability).where(
                and_(Capability.organization_id == str(org_id), Capability.name.ilike(q))
            ).limit(10)
        )
        for c in result.scalars().all():
            domain_result = await self.db.execute(select(Domain).where(Domain.id == c.domain_id))
            domain = domain_result.scalar_one_or_none()
            parent = domain.name if domain else ""
            results.append({"type": "capability", "id": str(c.id), "title": c.name, "description": c.description, "parent_path": f"{parent} / {c.name}", "status": None})

        result = await self.db.execute(
            select(SubCapability).where(
                and_(SubCapability.organization_id == str(org_id), SubCapability.name.ilike(q))
            ).limit(10)
        )
        for s in result.scalars().all():
            cap_result = await self.db.execute(select(Capability).where(Capability.id == s.capability_id))
            cap = cap_result.scalar_one_or_none()
            domain_result = await self.db.execute(select(Domain).where(Domain.id == cap.domain_id)) if cap else None
            domain = domain_result.scalar_one_or_none() if domain_result else None
            parent = f"{domain.name} / {cap.name}" if domain and cap else ""
            results.append({"type": "sub_capability", "id": str(s.id), "title": s.name, "description": s.description, "parent_path": f"{parent} / {s.name}", "status": None})

        result = await self.db.execute(
            select(ChecklistItem).where(
                and_(ChecklistItem.organization_id == str(org_id), ChecklistItem.title.ilike(q))
            ).limit(10)
        )
        for item in result.scalars().all():
            sub_result = await self.db.execute(select(SubCapability).where(SubCapability.id == item.sub_capability_id))
            sub = sub_result.scalar_one_or_none()
            cap_result = await self.db.execute(select(Capability).where(Capability.id == sub.capability_id)) if sub else None
            cap = cap_result.scalar_one_or_none() if cap_result else None
            domain_result = await self.db.execute(select(Domain).where(Domain.id == cap.domain_id)) if cap else None
            domain = domain_result.scalar_one_or_none() if domain_result else None
            parent = f"{domain.name} / {cap.name} / {sub.name}" if domain and cap and sub else ""
            results.append({"type": "checklist_item", "id": str(item.id), "title": item.title, "description": item.description, "parent_path": parent,            "status": _status_value(item.status)})

        return {"results": results, "total": len(results)}

    async def get_recently_updated(self, org_id: str, limit: int = 10) -> list:
        result = await self.db.execute(
            select(ChecklistItem)
            .where(ChecklistItem.organization_id == str(org_id))
            .order_by(ChecklistItem.updated_at.desc())
            .limit(limit)
        )
        items = result.scalars().all()
        return [{
            "id": str(i.id),
            "title": i.title,
            "description": i.description,
            "status": _status_value(i.status),
            "owner": i.owner,
            "due_date": i.due_date,
            "notes": i.notes,
            "evidence_url": i.evidence_url,
            "display_order": i.display_order,
            "sub_capability_id": str(i.sub_capability_id),
            "assigned_to": str(i.assigned_to) if i.assigned_to else None,
            "last_updated_by": str(i.last_updated_by) if i.last_updated_by else None,
            "created_at": i.created_at,
            "updated_at": i.updated_at,
        } for i in items]

    async def _log_audit(self, org_id: str, user_id: str, action: AuditAction, entity_type: str, entity_id: str, changes: str = None):
        log = AuditLog(
            organization_id=str(org_id),
            user_id=str(user_id),
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            changes=changes,
        )
        self.db.add(log)
        await self.db.flush()
