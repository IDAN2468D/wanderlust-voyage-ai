"""
SQLAlchemy ORM Models for Wanderlust Voyage AI.
Supports both Render/Docker PostgreSQL and local SQLite fallback seamlessly.
"""
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    role = Column(String(32), default="user", nullable=False)
    picture = Column(Text, nullable=True)
    auth_provider = Column(String(32), default="local", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)


class BookingModel(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_ref = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=True)
    recipient_email = Column(String(255), index=True, nullable=False)
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(64), nullable=True)
    passport_number = Column(String(64), nullable=True)
    destination = Column(String(255), nullable=False)
    duration_days = Column(Integer, default=7, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    flight_portion = Column(Float, nullable=True)
    hotel_portion = Column(Float, nullable=True)
    payment_method = Column(String(32), default="card", nullable=False)
    installments = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="CONFIRMED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class SavedTripModel(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(128), unique=True, index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=True)
    user_email = Column(String(255), index=True, nullable=True)
    origin = Column(String(64), default="TLV", nullable=False)
    destination = Column(String(255), nullable=False)
    start_date = Column(String(32), nullable=True)
    duration_days = Column(Integer, default=7, nullable=False)
    total_budget = Column(Float, default=2400.0, nullable=False)
    total_estimated = Column(Float, default=0.0, nullable=False)
    budget_status = Column(String(32), default="APPROVED", nullable=False)
    travel_style = Column(String(32), default="balanced", nullable=False)
    markdown_plan = Column(Text, default="", nullable=False)
    plan_payload_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)


class NewsletterSubscriberModel(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    preferred_language = Column(String(16), default="he", nullable=False)
    interests_json = Column(Text, default="[]", nullable=False)
    editions_sent = Column(Integer, default=0, nullable=False)
    last_edition_id = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    subscribed_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)


class ContactInquiryModel(Base):
    __tablename__ = "contact_inquiries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class KnowledgeChunkModel(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chunk_id = Column(String(128), unique=True, index=True, nullable=False)
    doc_id = Column(String(128), index=True, nullable=False)
    owner_user_id = Column(String(64), index=True, nullable=True)
    destination = Column(String(128), index=True, nullable=False)
    category = Column(String(64), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags_json = Column(Text, default="[]", nullable=False)
    embedding_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class TravelerProfileModel(Base):
    __tablename__ = "traveler_profiles"

    user_id = Column(String(64), primary_key=True, index=True)
    kosher_level = Column(String(32), default="none", nullable=False)
    shabbat_observant = Column(Boolean, default=False, nullable=False)
    accessibility_mode = Column(Boolean, default=False, nullable=False)
    passport_expiry = Column(String(32), nullable=True)
    home_airport = Column(String(16), default="TLV", nullable=False)
    preferred_currency = Column(String(10), default="ILS", nullable=False)
    preferred_pace = Column(String(32), default="balanced", nullable=False)
    loyalty_programs_json = Column(Text, default="[]", nullable=False)
    preferences_json = Column(Text, default="{}", nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)


class PendingActionModel(Base):
    __tablename__ = "pending_actions"

    action_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    action_type = Column(String(64), nullable=False)
    payload_json = Column(Text, default="{}", nullable=False)
    status = Column(String(32), default="pending_approval", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class TripVoteModel(Base):
    __tablename__ = "trip_votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(128), index=True, nullable=False)
    voter_name = Column(String(128), nullable=False)
    item_type = Column(String(32), nullable=False)  # flight | hotel | activity
    item_id = Column(String(128), nullable=False)
    vote = Column(Integer, default=1, nullable=False)  # 1 or -1
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class AgentCommerceSessionModel(Base):
    __tablename__ = "agent_commerce_sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    external_agent_provider = Column(String(48), nullable=False)
    user_id = Column(String(64), index=True, nullable=False)
    delegated_token_hash = Column(String(128), nullable=False)
    max_authorized_ils = Column(Float, nullable=False)
    executed_total_ils = Column(Float, default=0.0, nullable=False)
    destination = Column(String(128), nullable=False)
    sku_codes_json = Column(Text, default="[]", nullable=False)
    fulfillment_mode = Column(String(48), default="DIGITAL_VOUCHER", nullable=False)
    booking_ref = Column(String(64), nullable=True)
    status = Column(String(48), default="AUTHORIZED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class InterestWatcherModel(Base):
    __tablename__ = "proactive_interest_watchers"

    interest_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    raw_prompt_hebrew = Column(Text, nullable=False)
    extracted_keywords_json = Column(Text, default="[]", nullable=False)
    target_category = Column(String(48), default="ALL", nullable=False)
    max_price_ils = Column(Float, nullable=False)
    auto_reserve_vip = Column(Boolean, default=False, nullable=False)
    matched_alerts_json = Column(Text, default="[]", nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    last_evaluated_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class PriceProtectionPolicyModel(Base):
    __tablename__ = "price_protection_policies"

    policy_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    booking_ref = Column(String(64), index=True, nullable=False)
    destination = Column(String(128), nullable=False)
    sku_code = Column(String(64), nullable=False)
    paid_amount_ils = Column(Float, nullable=False)
    lowest_observed_ils = Column(Float, nullable=False)
    refunded_total_ils = Column(Float, default=0.0, nullable=False)
    vip_tier = Column(String(32), default="PLATINUM", nullable=False)
    coverage_days = Column(Integer, default=30, nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class TravelWalletEntryModel(Base):
    __tablename__ = "travel_wallet_entries"

    entry_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    booking_ref = Column(String(64), index=True, nullable=True)
    entry_type = Column(String(48), default="PRICE_DROP_REFUND", nullable=False)
    amount_ils = Column(Float, nullable=False)
    description_he = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)


class PulseActionExecutionModel(Base):
    __tablename__ = "pulse_action_executions"

    execution_id = Column(String(64), primary_key=True, index=True)
    action_id = Column(String(64), index=True, nullable=False)
    user_id = Column(String(64), index=True, nullable=False)
    skill_name = Column(String(64), nullable=False)
    outcome_summary_he = Column(Text, nullable=False)
    status = Column(String(32), default="EXECUTED", nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
