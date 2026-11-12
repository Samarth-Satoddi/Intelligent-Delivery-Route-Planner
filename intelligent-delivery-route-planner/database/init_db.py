"""Database initialization and schema migration helper."""
import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.connection import Base, engine, SessionLocal
from database.models import User
from auth.security import hash_password


def init_db():
    """Create all database tables."""
    print("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")


def seed_admin_if_none(email: str = "admin@campus.edu", password: str = "Admin@Campus2026!"):
    """Seed initial administrator account if no admin exists."""
    db = SessionLocal()
    try:
        admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if admin_count == 0:
            print(f"Creating default administrator account ({email})...")
            admin = User(
                email=email.lower(),
                full_name="Campus Operations Admin",
                hashed_password=hash_password(password),
                role="ADMIN",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print("Default admin created successfully.")
        else:
            print("Administrator account already exists.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    seed_admin_if_none()

