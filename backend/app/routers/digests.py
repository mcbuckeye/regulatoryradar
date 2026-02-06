from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, and_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import User, DigestHistory, RegulatoryUpdate, UpdateAnalysis
from app.schemas import DigestResponse, DigestPreviewRequest
from app.auth import get_current_user
from app.services.digest import generate_digest

router = APIRouter(prefix="/api/digests", tags=["digests"])


@router.get("")
async def list_digests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(DigestHistory).where(DigestHistory.user_id == current_user.id)
    )
    total = count_result.scalar() or 0
    
    # Get paginated items
    skip = (page - 1) * page_size
    result = await db.execute(
        select(DigestHistory)
        .where(DigestHistory.user_id == current_user.id)
        .order_by(desc(DigestHistory.sent_at))
        .offset(skip)
        .limit(page_size)
    )
    items = result.scalars().all()
    
    return {"items": items, "total": total}


@router.get("/{digest_id}", response_model=DigestResponse)
async def get_digest(
    digest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DigestHistory).where(
            DigestHistory.id == digest_id,
            DigestHistory.user_id == current_user.id,
        )
    )
    digest = result.scalar_one_or_none()
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    return digest


@router.post("/preview")
async def preview_digest(
    data: DigestPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=data.hours_back)

    result = await db.execute(
        select(RegulatoryUpdate)
        .options(selectinload(RegulatoryUpdate.analysis))
        .where(RegulatoryUpdate.scraped_at >= cutoff)
        .order_by(desc(RegulatoryUpdate.scraped_at))
        .limit(50)
    )
    updates = result.scalars().unique().all()

    updates_with_analysis = []
    for update in updates:
        updates_with_analysis.append({
            "id": update.id,
            "title": update.title,
            "source": update.source,
            "source_url": update.source_url,
            "update_type": update.update_type,
            "published_date": update.published_date,
            "summary": update.analysis.summary if update.analysis else None,
            "relevance_score": update.analysis.relevance_score if update.analysis else None,
            "impact_level": update.analysis.impact_level if update.analysis else None,
            "key_points": update.analysis.key_points if update.analysis else [],
        })

    html_content = generate_digest(current_user, updates_with_analysis)

    return {
        "html": html_content,
        "update_count": len(updates_with_analysis),
        "period_hours": data.hours_back,
    }
