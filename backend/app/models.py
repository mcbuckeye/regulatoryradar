from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey,
    UniqueConstraint, ARRAY, JSON,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    digest_time = Column(String(5), default="07:00")
    digest_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    therapeutic_areas = relationship("UserTherapeuticArea", back_populates="user", cascade="all, delete-orphan")
    watched_companies = relationship("WatchedCompany", back_populates="user", cascade="all, delete-orphan")
    relevances = relationship("UserUpdateRelevance", back_populates="user", cascade="all, delete-orphan")
    digests = relationship("DigestHistory", back_populates="user", cascade="all, delete-orphan")
    saved_searches = relationship("SavedSearch", back_populates="user", cascade="all, delete-orphan")


class UserTherapeuticArea(Base):
    __tablename__ = "user_therapeutic_areas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    keywords = Column(ARRAY(Text), default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="therapeutic_areas")


class WatchedCompany(Base):
    __tablename__ = "watched_companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_name = Column(String(255), nullable=False)
    aliases = Column(ARRAY(Text), default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="watched_companies")


class RegulatoryUpdate(Base):
    __tablename__ = "regulatory_updates"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_source_source_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False, index=True)
    source_id = Column(String(255), nullable=False)
    source_url = Column(Text)
    title = Column(Text, nullable=False)
    content = Column(Text)
    update_type = Column(String(100), index=True)
    therapeutic_areas = Column(ARRAY(Text), default=[])
    companies_mentioned = Column(ARRAY(Text), default=[])
    published_date = Column(DateTime(timezone=True))
    scraped_at = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(JSONB, default={})

    analysis = relationship("UpdateAnalysis", back_populates="update", uselist=False, cascade="all, delete-orphan")
    relevances = relationship("UserUpdateRelevance", back_populates="update", cascade="all, delete-orphan")


class UpdateAnalysis(Base):
    __tablename__ = "update_analyses"

    id = Column(Integer, primary_key=True, index=True)
    update_id = Column(Integer, ForeignKey("regulatory_updates.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(Text)
    relevance_score = Column(Float)
    impact_level = Column(String(20))
    key_points = Column(ARRAY(Text), default=[])
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now())

    update = relationship("RegulatoryUpdate", back_populates="analysis")


class UserUpdateRelevance(Base):
    __tablename__ = "user_update_relevances"
    __table_args__ = (
        UniqueConstraint("user_id", "update_id", name="uq_user_update"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    update_id = Column(Integer, ForeignKey("regulatory_updates.id", ondelete="CASCADE"), nullable=False)
    relevance_score = Column(Float)
    is_competitor_related = Column(Boolean, default=False)
    is_bookmarked = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="relevances")
    update = relationship("RegulatoryUpdate", back_populates="relevances")


class DigestHistory(Base):
    __tablename__ = "digest_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    update_ids = Column(ARRAY(Integer), default=[])
    email_content = Column(Text)
    delivery_status = Column(String(50), default="pending")

    user = relationship("User", back_populates="digests")


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    query_params = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_searches")


class ScrapeLog(Base):
    __tablename__ = "scrape_logs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    updates_found = Column(Integer, default=0)
    new_updates = Column(Integer, default=0)
    status = Column(String(20), default="running")
    error_message = Column(Text)
