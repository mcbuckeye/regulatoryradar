from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserTherapeuticArea, WatchedCompany
from app.schemas import (
    UserSettingsResponse, UserSettingsUpdate,
    TherapeuticAreaCreate, TherapeuticAreaUpdate, TherapeuticAreaResponse,
    WatchedCompanyCreate, WatchedCompanyResponse,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.therapeutic_areas),
            selectinload(User.watched_companies),
        )
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.digest_time is not None:
        current_user.digest_time = data.digest_time
    if data.digest_enabled is not None:
        current_user.digest_enabled = data.digest_enabled

    db.add(current_user)
    await db.flush()

    result = await db.execute(
        select(User)
        .options(
            selectinload(User.therapeutic_areas),
            selectinload(User.watched_companies),
        )
        .where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


# ─── Therapeutic Areas ───────────────────────────────────────────────────────

@router.get("/therapeutic-areas", response_model=list[TherapeuticAreaResponse])
async def list_therapeutic_areas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserTherapeuticArea)
        .where(UserTherapeuticArea.user_id == current_user.id)
        .order_by(desc(UserTherapeuticArea.created_at))
    )
    return result.scalars().all()


@router.post("/therapeutic-areas", response_model=TherapeuticAreaResponse, status_code=201)
async def create_therapeutic_area(
    data: TherapeuticAreaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    area = UserTherapeuticArea(
        user_id=current_user.id,
        name=data.name,
        keywords=data.keywords,
        is_active=data.is_active,
    )
    db.add(area)
    await db.flush()
    await db.refresh(area)
    return area


@router.put("/therapeutic-areas/{area_id}", response_model=TherapeuticAreaResponse)
async def update_therapeutic_area(
    area_id: int,
    data: TherapeuticAreaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserTherapeuticArea).where(
            UserTherapeuticArea.id == area_id,
            UserTherapeuticArea.user_id == current_user.id,
        )
    )
    area = result.scalar_one_or_none()
    if area is None:
        raise HTTPException(status_code=404, detail="Therapeutic area not found")

    if data.name is not None:
        area.name = data.name
    if data.keywords is not None:
        area.keywords = data.keywords
    if data.is_active is not None:
        area.is_active = data.is_active

    await db.flush()
    await db.refresh(area)
    return area


@router.delete("/therapeutic-areas/{area_id}", status_code=204)
async def delete_therapeutic_area(
    area_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserTherapeuticArea).where(
            UserTherapeuticArea.id == area_id,
            UserTherapeuticArea.user_id == current_user.id,
        )
    )
    area = result.scalar_one_or_none()
    if area is None:
        raise HTTPException(status_code=404, detail="Therapeutic area not found")

    await db.delete(area)
    await db.flush()
    return None


# ─── Watched Companies ──────────────────────────────────────────────────────

@router.get("/watched-companies", response_model=list[WatchedCompanyResponse])
async def list_watched_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchedCompany)
        .where(WatchedCompany.user_id == current_user.id)
        .order_by(desc(WatchedCompany.created_at))
    )
    return result.scalars().all()


@router.post("/watched-companies", response_model=WatchedCompanyResponse, status_code=201)
async def create_watched_company(
    data: WatchedCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = WatchedCompany(
        user_id=current_user.id,
        company_name=data.company_name,
        aliases=data.aliases,
    )
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company


@router.delete("/watched-companies/{company_id}", status_code=204)
async def delete_watched_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WatchedCompany).where(
            WatchedCompany.id == company_id,
            WatchedCompany.user_id == current_user.id,
        )
    )
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Watched company not found")

    await db.delete(company)
    await db.flush()
    return None
