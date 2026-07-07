from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ProgressSummary(BaseModel):
    total_items: int = 0
    completed_items: int = 0
    not_started: int = 0
    in_progress: int = 0
    blocked: int = 0
    not_applicable: int = 0
    completion_pct: float = 0.0
    overdue_items: int = 0

    class Config:
        from_attributes = True


class ChecklistItemResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None
    display_order: int = 0
    sub_capability_id: str
    assigned_to: Optional[str] = None
    last_updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChecklistItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None
    display_order: Optional[int] = None


class SubCapabilityResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    display_order: int = 0
    capability_id: str
    progress: ProgressSummary = ProgressSummary()
    checklist_items: Optional[List[ChecklistItemResponse]] = None

    class Config:
        from_attributes = True


class CapabilityResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    display_order: int = 0
    domain_id: str
    sub_capability_count: int = 0
    completed_sub_capabilities: int = 0
    progress: ProgressSummary = ProgressSummary()
    sub_capabilities: Optional[List[SubCapabilityResponse]] = None

    class Config:
        from_attributes = True


class DomainResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    display_order: int = 0
    accent_color: str = "#0d9488"
    icon_name: str = "shield"
    capability_count: int = 0
    completed_capabilities: int = 0
    progress: ProgressSummary = ProgressSummary()
    capabilities: Optional[List[CapabilityResponse]] = None

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    overall_completion_pct: float = 0.0
    total_completed_items: int = 0
    total_items: int = 0
    in_progress_items: int = 0
    overdue_items: int = 0
    domains: List[DomainResponse] = []


class SearchResult(BaseModel):
    type: str  # domain, capability, sub_capability, checklist_item
    id: str
    title: str
    description: Optional[str] = None
    parent_path: str  # breadcrumb-like path
    status: Optional[str] = None


class SearchResponse(BaseModel):
    results: List[SearchResult] = []
    total: int = 0


class AggregatedProgress(BaseModel):
    completion_pct: float
    total_items: int
    completed_items: int
    not_started: int
    in_progress: int
    blocked: int
    not_applicable: int
    overdue_items: int
    recently_updated: List[ChecklistItemResponse] = []
