from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_, and_, desc, asc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import User, RegulatoryUpdate, UpdateAnalysis, UserUpdateRelevance
from app.schemas import UpdateResponse, PaginatedUpdatesResponse, UpdateAnalysisResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/updates", tags=["updates"])


def _build_update_response(update: RegulatoryUpdate, user_relevance: Optional[UserUpdateRelevance] = None) -> dict:
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
        is_bookmarked=user_relevance.is_bookmarked if user_relevance else False,
        is_read=user_relevance.is_read if user_relevance else False,
    )


@router.get("", response_model=PaginatedUpdatesResponse)
async def list_updates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    update_type: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    therapeutic_area: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("date", regex="^(date|relevance)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(RegulatoryUpdate).options(selectinload(RegulatoryUpdate.analysis))

    filters = []
    if source:
        filters.append(RegulatoryUpdate.source == source)
    if update_type:
        filters.append(RegulatoryUpdate.update_type == update_type)
    if date_from:
        # Use scraped_at as fallback when published_date is NULL
        filters.append(func.coalesce(RegulatoryUpdate.published_date, RegulatoryUpdate.scraped_at) >= date_from)
    if date_to:
        filters.append(func.coalesce(RegulatoryUpdate.published_date, RegulatoryUpdate.scraped_at) <= date_to)
    if therapeutic_area:
        filters.append(RegulatoryUpdate.therapeutic_areas.any(therapeutic_area))
    if search:
        search_filter = or_(
            RegulatoryUpdate.title.ilike(f"%{search}%"),
            RegulatoryUpdate.content.ilike(f"%{search}%"),
        )
        filters.append(search_filter)

    if min_score is not None or max_score is not None:
        query = query.join(UpdateAnalysis, RegulatoryUpdate.id == UpdateAnalysis.update_id, isouter=True)
        if min_score is not None:
            filters.append(UpdateAnalysis.relevance_score >= min_score)
        if max_score is not None:
            filters.append(UpdateAnalysis.relevance_score <= max_score)

    if filters:
        query = query.where(and_(*filters))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    if sort_by == "relevance":
        if min_score is None and max_score is None:
            query = query.join(UpdateAnalysis, RegulatoryUpdate.id == UpdateAnalysis.update_id, isouter=True)
        query = query.order_by(desc(UpdateAnalysis.relevance_score).nulls_last())
    else:
        # Use scraped_at as fallback when published_date is NULL for sorting
        query = query.order_by(desc(func.coalesce(RegulatoryUpdate.published_date, RegulatoryUpdate.scraped_at)))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    updates = result.scalars().unique().all()

    update_ids = [u.id for u in updates]
    relevance_result = await db.execute(
        select(UserUpdateRelevance).where(
            and_(
                UserUpdateRelevance.user_id == current_user.id,
                UserUpdateRelevance.update_id.in_(update_ids),
            )
        )
    )
    relevance_map = {r.update_id: r for r in relevance_result.scalars().all()}

    items = [_build_update_response(u, relevance_map.get(u.id)) for u in updates]

    return PaginatedUpdatesResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{update_id}", response_model=UpdateResponse)
async def get_update(
    update_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RegulatoryUpdate)
        .options(selectinload(RegulatoryUpdate.analysis))
        .where(RegulatoryUpdate.id == update_id)
    )
    update = result.scalar_one_or_none()
    if update is None:
        raise HTTPException(status_code=404, detail="Update not found")

    relevance_result = await db.execute(
        select(UserUpdateRelevance).where(
            and_(
                UserUpdateRelevance.user_id == current_user.id,
                UserUpdateRelevance.update_id == update_id,
            )
        )
    )
    user_relevance = relevance_result.scalar_one_or_none()

    return _build_update_response(update, user_relevance)


@router.post("/{update_id}/bookmark")
async def toggle_bookmark(
    update_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RegulatoryUpdate).where(RegulatoryUpdate.id == update_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Update not found")

    relevance_result = await db.execute(
        select(UserUpdateRelevance).where(
            and_(
                UserUpdateRelevance.user_id == current_user.id,
                UserUpdateRelevance.update_id == update_id,
            )
        )
    )
    user_relevance = relevance_result.scalar_one_or_none()

    if user_relevance is None:
        user_relevance = UserUpdateRelevance(
            user_id=current_user.id,
            update_id=update_id,
            is_bookmarked=True,
        )
        db.add(user_relevance)
    else:
        user_relevance.is_bookmarked = not user_relevance.is_bookmarked

    await db.flush()
    return {"bookmarked": user_relevance.is_bookmarked}


@router.post("/{update_id}/read")
async def mark_as_read(
    update_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RegulatoryUpdate).where(RegulatoryUpdate.id == update_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Update not found")

    relevance_result = await db.execute(
        select(UserUpdateRelevance).where(
            and_(
                UserUpdateRelevance.user_id == current_user.id,
                UserUpdateRelevance.update_id == update_id,
            )
        )
    )
    user_relevance = relevance_result.scalar_one_or_none()

    if user_relevance is None:
        user_relevance = UserUpdateRelevance(
            user_id=current_user.id,
            update_id=update_id,
            is_read=True,
        )
        db.add(user_relevance)
    else:
        user_relevance.is_read = True

    await db.flush()
    return {"is_read": True}
