from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, async_session_factory
from app.models import User, ScrapeLog
from app.schemas import ScrapeLogResponse, ManualScrapeRequest
from app.auth import get_current_user
from app.services.scraper_service import run_scrape

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "RegulatoryRadar"}


@router.post("/scrape", response_model=ScrapeLogResponse)
async def trigger_scrape(
    data: ManualScrapeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scrape_log = ScrapeLog(
        source=data.source,
        status="queued",
    )
    db.add(scrape_log)
    await db.flush()
    await db.refresh(scrape_log)
    log_id = scrape_log.id

    async def _run_scrape_bg(source: str, log_id: int):
        async with async_session_factory() as session:
            try:
                await run_scrape(source=source, db=session, log_id=log_id)
                await session.commit()
            except Exception as e:
                await session.rollback()
                log_result = await session.execute(
                    select(ScrapeLog).where(ScrapeLog.id == log_id)
                )
                log_entry = log_result.scalar_one_or_none()
                if log_entry:
                    log_entry.status = "error"
                    log_entry.error_message = str(e)
                    await session.commit()

    background_tasks.add_task(_run_scrape_bg, data.source, log_id)

    return scrape_log


@router.get("/scrape-logs", response_model=list[ScrapeLogResponse])
async def get_scrape_logs(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScrapeLog)
        .order_by(desc(ScrapeLog.started_at))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
