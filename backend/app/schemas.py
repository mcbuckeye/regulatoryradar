from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    digest_time: Optional[str] = "07:00"
    digest_enabled: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Therapeutic Areas ───────────────────────────────────────────────────────

class TherapeuticAreaCreate(BaseModel):
    name: str
    keywords: List[str] = []
    is_active: bool = True


class TherapeuticAreaUpdate(BaseModel):
    name: Optional[str] = None
    keywords: Optional[List[str]] = None
    is_active: Optional[bool] = None


class TherapeuticAreaResponse(BaseModel):
    id: int
    user_id: int
    name: str
    keywords: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Watched Companies ──────────────────────────────────────────────────────

class WatchedCompanyCreate(BaseModel):
    company_name: str
    aliases: List[str] = []


class WatchedCompanyResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    aliases: List[str] = []
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── User Settings ──────────────────────────────────────────────────────────

class UserSettingsUpdate(BaseModel):
    digest_time: Optional[str] = None
    digest_enabled: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    id: int
    email: str
    digest_time: Optional[str] = "07:00"
    digest_enabled: bool = True
    therapeutic_areas: List[TherapeuticAreaResponse] = []
    watched_companies: List[WatchedCompanyResponse] = []

    model_config = {"from_attributes": True}


# ─── Update Analysis ────────────────────────────────────────────────────────

class UpdateAnalysisResponse(BaseModel):
    id: int
    update_id: int
    summary: Optional[str] = None
    relevance_score: Optional[float] = None
    impact_level: Optional[str] = None
    key_points: List[str] = []
    analyzed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Regulatory Updates ─────────────────────────────────────────────────────

class UpdateResponse(BaseModel):
    id: int
    source: str
    source_id: str
    source_url: Optional[str] = None
    title: str
    content: Optional[str] = None
    update_type: Optional[str] = None
    therapeutic_areas: List[str] = []
    companies_mentioned: List[str] = []
    published_date: Optional[datetime] = None
    scraped_at: Optional[datetime] = None
    analysis: Optional[UpdateAnalysisResponse] = None
    is_bookmarked: bool = False
    is_read: bool = False

    model_config = {"from_attributes": True}


class UpdateFilters(BaseModel):
    source: Optional[str] = None
    update_type: Optional[str] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    therapeutic_area: Optional[str] = None
    search: Optional[str] = None


class PaginatedUpdatesResponse(BaseModel):
    items: List[UpdateResponse]
    total: int
    skip: int
    limit: int


# ─── User Update Relevance ──────────────────────────────────────────────────

class UserUpdateRelevanceResponse(BaseModel):
    id: int
    user_id: int
    update_id: int
    relevance_score: Optional[float] = None
    is_competitor_related: bool = False
    is_bookmarked: bool = False
    is_read: bool = False
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Digests ─────────────────────────────────────────────────────────────────

class DigestResponse(BaseModel):
    id: int
    user_id: int
    sent_at: Optional[datetime] = None
    update_ids: List[int] = []
    email_content: Optional[str] = None
    delivery_status: str = "pending"

    model_config = {"from_attributes": True}


class DigestPreviewRequest(BaseModel):
    hours_back: int = 24


# ─── Saved Searches ─────────────────────────────────────────────────────────

class SavedSearchCreate(BaseModel):
    name: str
    query_params: dict = {}


class SearchResponse(BaseModel):
    id: int
    user_id: int
    name: str
    query_params: dict = {}
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Scrape Logs ─────────────────────────────────────────────────────────────

class ScrapeLogResponse(BaseModel):
    id: int
    source: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updates_found: int = 0
    new_updates: int = 0
    status: str = "running"
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class ManualScrapeRequest(BaseModel):
    source: str = "all"


# ─── Search Results ──────────────────────────────────────────────────────────

class SearchResultsResponse(BaseModel):
    items: List[UpdateResponse]
    total: int
    query: str
