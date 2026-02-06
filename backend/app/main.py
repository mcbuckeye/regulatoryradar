import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import init_db, async_session_factory
from app.models import User, DigestHistory, RegulatoryUpdate, UpdateAnalysis
from app.seed import run_all_seeds
from app.services.scraper_service import run_scrape
from app.services.digest import generate_digest, send_digest

from app.routers.auth import router as auth_router
from app.routers.updates import router as updates_router
from app.routers.search import router as search_router
from app.routers.settings import router as settings_router
from app.routers.digests import router as digests_router
from app.routers.admin import router as admin_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scheduled_scrape():
    logger.info("Starting scheduled scrape...")
    async with async_session_factory() as db:
        try:
            await run_scrape(source="all", db=db)
            await db.commit()
            logger.info("Scheduled scrape completed successfully")
        except Exception as e:
            await db.rollback()
            logger.error(f"Scheduled scrape failed: {e}")


async def scheduled_digest():
    logger.info("Starting scheduled digest generation...")
    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(User).where(User.digest_enabled == True)
            )
            users = result.scalars().all()

            for user in users:
                try:
                    from datetime import timedelta
                    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

                    updates_result = await db.execute(
                        select(RegulatoryUpdate)
                        .options(selectinload(RegulatoryUpdate.analysis))
                        .where(RegulatoryUpdate.scraped_at >= cutoff)
                        .order_by(RegulatoryUpdate.scraped_at.desc())
                        .limit(50)
                    )
                    updates = updates_result.scalars().unique().all()

                    if not updates:
                        logger.info(f"No updates for digest to {user.email}")
                        continue

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

                    html_content = generate_digest(user, updates_with_analysis)
                    success = await send_digest(user.email, html_content)

                    digest_record = DigestHistory(
                        user_id=user.id,
                        update_ids=[u["id"] for u in updates_with_analysis],
                        email_content=html_content,
                        delivery_status="sent" if success else "failed",
                    )
                    db.add(digest_record)
                    await db.flush()

                    logger.info(
                        f"Digest {'sent' if success else 'failed'} for {user.email} "
                        f"with {len(updates_with_analysis)} updates"
                    )

                except Exception as e:
                    logger.error(f"Error generating digest for {user.email}: {e}")
                    continue

            await db.commit()

        except Exception as e:
            await db.rollback()
            logger.error(f"Scheduled digest failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("RegulatoryRadar starting up...")

    await init_db()
    logger.info("Database tables created")

    async with async_session_factory() as db:
        try:
            await run_all_seeds(db)
        except Exception as e:
            logger.error(f"Seed data error: {e}")

    scheduler.add_job(
        scheduled_scrape,
        trigger=IntervalTrigger(hours=6),
        id="scrape_job",
        name="Scrape FDA and ClinicalTrials.gov",
        replace_existing=True,
    )

    scheduler.add_job(
        scheduled_digest,
        trigger=CronTrigger(hour=12, minute=0, timezone="UTC"),
        id="digest_job",
        name="Send daily digest (7 AM ET = 12:00 UTC)",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("APScheduler started with scrape (every 6h) and digest (7 AM ET) jobs")

    yield

    scheduler.shutdown(wait=False)
    logger.info("RegulatoryRadar shutting down")


app = FastAPI(
    title="RegulatoryRadar",
    description="AI-curated FDA regulatory intelligence platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(updates_router)
app.include_router(search_router)
app.include_router(settings_router)
app.include_router(digests_router)
app.include_router(admin_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "RegulatoryRadar",
        "version": "1.0.0",
    }
