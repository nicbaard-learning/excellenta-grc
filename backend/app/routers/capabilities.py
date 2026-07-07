from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_org_id
from app.models import User
from app.schemas.capability import (
    DashboardResponse, DomainResponse, CapabilityResponse,
    SubCapabilityResponse, ChecklistItemResponse, ChecklistItemCreate,
    ChecklistItemUpdate, SearchResponse, AggregatedProgress,
)
from app.services.capability_service import CapabilityService

router = APIRouter(prefix="/capabilities", tags=["Capabilities"])


# --- Dashboard ---

@router.get("/dashboard")
async def get_dashboard(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    return await service.get_dashboard(org_id)


# --- Domains ---

@router.get("/domains")
async def get_domains(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    domains = await service.get_domains(org_id)
    result = []
    for domain in domains:
        progress = await service.get_domain_progress(domain.id)
        caps = await service.get_capabilities(domain.id)
        result.append({
            "id": str(domain.id),
            "name": domain.name,
            "slug": domain.slug,
            "description": domain.description,
            "display_order": domain.display_order,
            "accent_color": domain.accent_color,
            "icon_name": domain.icon_name,
            "capability_count": len(caps),
            "progress": progress,
        })
    return result


@router.get("/domains/{domain_id}")
async def get_domain_detail(
    domain_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    result = await service.get_domain_detail(domain_id, org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Domain not found")
    return result


# --- Capabilities ---

@router.get("/capabilities/{capability_id}")
async def get_capability_detail(
    capability_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    result = await service.get_capability_detail(capability_id, org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Capability not found")
    return result


# --- Sub-Capabilities ---

@router.get("/sub-capabilities/{sub_id}")
async def get_sub_capability_detail(
    sub_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    result = await service.get_sub_capability_detail(sub_id, org_id)
    if not result:
        raise HTTPException(status_code=404, detail="Sub-capability not found")
    return result


# --- Checklist Items ---

@router.get("/sub-capabilities/{sub_id}/checklist-items")
async def get_checklist_items(
    sub_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    items = await service.get_checklist_items(sub_id)
    return [{
        "id": str(i.id), "title": i.title, "description": i.description,
        "status": getattr(i.status, 'value', i.status) or "not_started",
        "owner": i.owner, "due_date": i.due_date, "notes": i.notes,
        "evidence_url": i.evidence_url, "display_order": i.display_order,
        "sub_capability_id": str(i.sub_capability_id),
        "assigned_to": str(i.assigned_to) if i.assigned_to else None,
        "last_updated_by": str(i.last_updated_by) if i.last_updated_by else None,
        "created_at": i.created_at, "updated_at": i.updated_at,
    } for i in items]


@router.post("/sub-capabilities/{sub_id}/checklist-items", status_code=201)
async def create_checklist_item(
    sub_id: str,
    data: ChecklistItemCreate,
    org_id: str = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    item = await service.create_checklist_item(sub_id, org_id, {
        **data.model_dump(),
        "user_id": current_user.id,
    })
    return {
        "id": str(item.id), "title": item.title, "description": item.description,
        "status": getattr(item.status, 'value', item.status) or "not_started",
        "owner": item.owner, "due_date": item.due_date, "notes": item.notes,
        "evidence_url": item.evidence_url, "display_order": item.display_order,
        "sub_capability_id": str(item.sub_capability_id),
        "assigned_to": str(item.assigned_to) if item.assigned_to else None,
        "last_updated_by": str(item.last_updated_by) if item.last_updated_by else None,
        "created_at": item.created_at, "updated_at": item.updated_at,
    }


@router.put("/checklist-items/{item_id}")
async def update_checklist_item(
    item_id: str,
    data: ChecklistItemUpdate,
    org_id: str = Depends(get_current_org_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    item = await service.update_checklist_item(item_id, org_id, data.model_dump(exclude_none=True), current_user.id)
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return {
        "id": str(item.id), "title": item.title, "description": item.description,
        "status": getattr(item.status, 'value', item.status) or "not_started",
        "owner": item.owner, "due_date": item.due_date, "notes": item.notes,
        "evidence_url": item.evidence_url, "display_order": item.display_order,
        "sub_capability_id": str(item.sub_capability_id),
        "assigned_to": str(item.assigned_to) if item.assigned_to else None,
        "last_updated_by": str(item.last_updated_by) if item.last_updated_by else None,
        "created_at": item.created_at, "updated_at": item.updated_at,
    }


@router.delete("/checklist-items/{item_id}", status_code=204)
async def delete_checklist_item(
    item_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    success = await service.delete_checklist_item(item_id, org_id)
    if not success:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return None


# --- Search ---

@router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    return await service.search(org_id, q)


# --- Aggregation ---

@router.get("/progress/overview")
async def get_overall_progress(
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    service = CapabilityService(db)
    progress = await service.get_org_progress(org_id)
    recent = await service.get_recently_updated(org_id)
    return {
        "completion_pct": progress.completion_pct,
        "total_items": progress.total_items,
        "completed_items": progress.completed_items,
        "not_started": progress.not_started,
        "in_progress": progress.in_progress,
        "blocked": progress.blocked,
        "not_applicable": progress.not_applicable,
        "overdue_items": progress.overdue_items,
        "recently_updated": recent,
    }
