"""
Wanderlust Voyage AI - Persistent Database Layer (PostgreSQL / SQLite).
"""
from app.db.database import (
    Base,
    get_db,
    get_db_session,
    init_db,
    get_active_db_backend,
    get_active_db_url,
    override_database_url,
)
from app.db.models import (
    UserModel,
    BookingModel,
    SavedTripModel,
    NewsletterSubscriberModel,
    ContactInquiryModel,
)

__all__ = [
    "Base",
    "get_db",
    "get_db_session",
    "init_db",
    "get_active_db_backend",
    "get_active_db_url",
    "override_database_url",
    "UserModel",
    "BookingModel",
    "SavedTripModel",
    "NewsletterSubscriberModel",
    "ContactInquiryModel",
]
