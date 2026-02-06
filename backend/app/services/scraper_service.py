import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    RegulatoryUpdate, UpdateAnalysis, ScrapeLog,
    UserTherapeuticArea,
)
from app.scrapers.fda import scrape_fda_guidances, scrape_fda_approvals
from app.scrapers.clinicaltrials import search_trials
from app.services.ai_analysis import analyze_update

logger = logging.getLogger(__name__)


async def _get_all_therapeutic_keywords(db: AsyncSession) -> list[str]:
    result = await db.execute(
        select(UserTherapeuticArea).where(UserTherapeuticArea.is_active == True)
    )
    areas = result.scalars().all()

    all_keywords = set()
    for area in areas:
        if area.keywords:
            for kw in area.keywords:
                all_keywords.add(kw.lower())
        all_keywords.add(area.name.lower())

    return list(all_keywords) if all_keywords else ["oncology", "cancer", "tumor"]


async def _save_updates(
    db: AsyncSession,
    raw_updates: list[dict],
    source: str,
) -> tuple[int, int]:
    found = len(raw_updates)
    new_count = 0

    for item in raw_updates:
        source_id = item.get("source_id", "")
        if not source_id:
            continue

        existing = await db.execute(
            select(RegulatoryUpdate).where(
                and_(
                    RegulatoryUpdate.source == source,
                    RegulatoryUpdate.source_id == source_id,
                )
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        update = RegulatoryUpdate(
            source=source,
            source_id=source_id,
            source_url=item.get("source_url", ""),
            title=item.get("title", "Unknown"),
            content=item.get("content", ""),
            update_type=item.get("update_type", "other"),
            therapeutic_areas=item.get("therapeutic_areas", []),
            companies_mentioned=item.get("companies_mentioned", []),
            published_date=item.get("published_date"),
            raw_data=item.get("raw_data", {}),
        )
        db.add(update)
        await db.flush()
        new_count += 1

    return found, new_count


async def _analyze_new_updates(db: AsyncSession, therapeutic_keywords: list[str]) -> None:
    result = await db.execute(
        select(RegulatoryUpdate)
        .outerjoin(UpdateAnalysis, RegulatoryUpdate.id == UpdateAnalysis.update_id)
        .where(UpdateAnalysis.id == None)
        .limit(50)
    )
    unanalyzed = result.scalars().all()

    for update in unanalyzed:
        try:
            update_dict = {
                "title": update.title,
                "content": update.content or "",
            }
            analysis_result = await analyze_update(update_dict, therapeutic_keywords)

            analysis = UpdateAnalysis(
                update_id=update.id,
                summary=analysis_result.get("summary", ""),
                relevance_score=analysis_result.get("relevance_score", 50),
                impact_level=analysis_result.get("impact_level", "medium"),
                key_points=analysis_result.get("key_points", []),
            )
            db.add(analysis)
            await db.flush()

            logger.info(f"Analyzed update {update.id}: score={analysis.relevance_score}")
        except Exception as e:
            logger.error(f"Error analyzing update {update.id}: {e}")
            continue


async def run_scrape(
    source: str = "all",
    db: Optional[AsyncSession] = None,
    log_id: Optional[int] = None,
) -> Optional[ScrapeLog]:
    if db is None:
        logger.error("Database session required for scraping")
        return None

    scrape_log = None
    if log_id:
        result = await db.execute(select(ScrapeLog).where(ScrapeLog.id == log_id))
        scrape_log = result.scalar_one_or_none()

    if scrape_log is None:
        scrape_log = ScrapeLog(
            source=source,
            status="running",
        )
        db.add(scrape_log)
        await db.flush()

    scrape_log.status = "running"
    await db.flush()

    total_found = 0
    total_new = 0

    try:
        therapeutic_keywords = await _get_all_therapeutic_keywords(db)

        if source in ("all", "fda"):
            logger.info("Starting FDA guidances scrape...")
            guidances = await scrape_fda_guidances()
            found, new = await _save_updates(db, guidances, "fda")
            total_found += found
            total_new += new
            logger.info(f"FDA guidances: {found} found, {new} new")

            logger.info("Starting FDA approvals scrape...")
            approvals = await scrape_fda_approvals()
            found, new = await _save_updates(db, approvals, "fda")
            total_found += found
            total_new += new
            logger.info(f"FDA approvals: {found} found, {new} new")

        if source in ("all", "clinicaltrials"):
            logger.info("Starting ClinicalTrials.gov scrape...")
            trials = await search_trials(keywords=therapeutic_keywords)
            found, new = await _save_updates(db, trials, "clinicaltrials")
            total_found += found
            total_new += new
            logger.info(f"Clinical trials: {found} found, {new} new")

        if total_new > 0:
            logger.info(f"Analyzing {total_new} new updates...")
            await _analyze_new_updates(db, therapeutic_keywords)

        scrape_log.updates_found = total_found
        scrape_log.new_updates = total_new
        scrape_log.status = "completed"
        scrape_log.completed_at = datetime.now(timezone.utc)

        await db.flush()
        logger.info(f"Scrape completed: {total_found} found, {total_new} new")

    except Exception as e:
        logger.error(f"Scrape failed: {e}")
        scrape_log.status = "error"
        scrape_log.error_message = str(e)
        scrape_log.completed_at = datetime.now(timezone.utc)
        await db.flush()

    return scrape_log
