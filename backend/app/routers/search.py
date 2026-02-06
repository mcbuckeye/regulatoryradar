from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, RegulatoryUpdate, UpdateAnalysis, UserUpdateRelevance, SavedSearch
from app.schemas import (
    SearchResultsResponse, UpdateResponse, UpdateAnalysisResponse,
    SavedSearchCreate, SearchResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api", tags=["search"])


def _build_update_response_for_search(update: RegulatoryUpdate) -> UpdateResponse:
    analysis_data = None
    if update.analysis:
        analysis_data = UpdateAnalysisResponse(
            id=update.analysis.id,
            update_id=update.analysis.update_id,
            summary=update.analysis.summary,
            relevance_score=update.analysis.relevance_score,
            impact_level=update.analysis.impact_level,
            key_points=update.analysis.key_points or [],
            analyzed_at=update.analysis.analyzed_at,
        )

    return UpdateResponse(
        id=update.id,
        source=update.source,
        source_id=update.source_id,
        source_url=update.source_url,
        title=update.title,
        content=update.content,
        update_type=update.update_type,
        therapeutic_areas=update.therapeutic_areas or [],
        companies_mentioned=update.companies_mentioned or [],
        published_date=update.published_date,
        scraped_at=update.scraped_at,
        analysis=analysis_data,
        is_bookmarked=False,
        is_read=False,
    )


@router.get("/search", response_model=SearchResultsResponse)
async def search_updates(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search_filter = or_(
        RegulatoryUpdate.title.ilike(f"%{q}%"),
        RegulatoryUpdate.content.ilike(f"%{q}%"),
    )

    count_query = select(func.count()).select_from(
        select(RegulatoryUpdate.id).where(search_filter).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = (
        select(RegulatoryUpdate)
        .options(selectinload(RegulatoryUpdate.analysis))
        .where(search_filter)
        .order_by(desc(RegulatoryUpdate.published_date).nulls_last())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    updates = result.scalars().unique().all()

    items = [_build_update_response_for_search(u) for u in updates]

    return SearchResultsResponse(items=items, total=total, query=q)


@router.get("/saved-searches", response_model=list[SearchResponse])
async def list_saved_searches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(desc(SavedSearch.created_at))
    )
    return result.scalars().all()


@router.post("/saved-searches", response_model=SearchResponse, status_code=201)
async def create_saved_search(
    data: SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_search = SavedSearch(
        user_id=current_user.id,
        name=data.name,
        query_params=data.query_params,
    )
    db.add(saved_search)
    await db.flush()
    await db.refresh(saved_search)
    return saved_search


@router.delete("/saved-searches/{search_id}", status_code=204)
async def delete_saved_search(
    search_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    saved_search = result.scalar_one_or_none()
    if saved_search is None:
        raise HTTPException(status_code=404, detail="Saved search not found")

    await db.delete(saved_search)
    await db.flush()
    return None
