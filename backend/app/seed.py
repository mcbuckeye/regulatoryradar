import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserTherapeuticArea, WatchedCompany
from app.auth import hash_password

logger = logging.getLogger(__name__)

DEFAULT_USER_EMAIL = "steve@ipwatcher.com"
DEFAULT_USER_PASSWORD = "5678*stud"

DEFAULT_THERAPEUTIC_AREAS = [
    {
        "name": "Oncology",
        "keywords": [
            "oncology", "cancer", "tumor", "carcinoma",
            "lymphoma", "leukemia", "melanoma", "sarcoma",
        ],
    },
]

DEFAULT_WATCHED_COMPANIES = [
    {"company_name": "Pfizer", "aliases": ["Pfizer Inc", "Pfizer Inc.", "PFE"]},
    {"company_name": "AbbVie", "aliases": ["AbbVie Inc", "AbbVie Inc.", "ABBV"]},
    {"company_name": "Roche", "aliases": ["Roche Holding", "F. Hoffmann-La Roche", "Genentech"]},
    {"company_name": "Novartis", "aliases": ["Novartis AG", "Novartis International", "NVS"]},
    {"company_name": "BMS", "aliases": ["Bristol-Myers Squibb", "Bristol Myers Squibb", "BMY"]},
]


async def seed_default_user(db: AsyncSession) -> int:
    result = await db.execute(
        select(User).where(User.email == DEFAULT_USER_EMAIL)
    )
    user = result.scalar_one_or_none()

    if user is not None:
        logger.info(f"Default user '{DEFAULT_USER_EMAIL}' already exists (id={user.id})")
        return user.id

    user = User(
        email=DEFAULT_USER_EMAIL,
        password_hash=hash_password(DEFAULT_USER_PASSWORD),
        digest_time="07:00",
        digest_enabled=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    logger.info(f"Created default user '{DEFAULT_USER_EMAIL}' (id={user.id})")
    return user.id


async def seed_default_therapeutic_areas(db: AsyncSession, user_id: int) -> None:
    for area_def in DEFAULT_THERAPEUTIC_AREAS:
        result = await db.execute(
            select(UserTherapeuticArea).where(
                UserTherapeuticArea.user_id == user_id,
                UserTherapeuticArea.name == area_def["name"],
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.info(f"Therapeutic area '{area_def['name']}' already exists for user {user_id}")
            continue

        area = UserTherapeuticArea(
            user_id=user_id,
            name=area_def["name"],
            keywords=area_def["keywords"],
            is_active=True,
        )
        db.add(area)
        logger.info(f"Created therapeutic area '{area_def['name']}' for user {user_id}")

    await db.flush()


async def seed_default_watched_companies(db: AsyncSession, user_id: int) -> None:
    for company_def in DEFAULT_WATCHED_COMPANIES:
        result = await db.execute(
            select(WatchedCompany).where(
                WatchedCompany.user_id == user_id,
                WatchedCompany.company_name == company_def["company_name"],
            )
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            logger.info(f"Watched company '{company_def['company_name']}' already exists for user {user_id}")
            continue

        company = WatchedCompany(
            user_id=user_id,
            company_name=company_def["company_name"],
            aliases=company_def["aliases"],
        )
        db.add(company)
        logger.info(f"Created watched company '{company_def['company_name']}' for user {user_id}")

    await db.flush()


async def run_all_seeds(db: AsyncSession) -> None:
    user_id = await seed_default_user(db)
    await seed_default_therapeutic_areas(db, user_id)
    await seed_default_watched_companies(db, user_id)
    await db.commit()
    logger.info("All seed data applied successfully")
