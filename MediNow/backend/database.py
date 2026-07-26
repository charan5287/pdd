from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
import logging

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./medinow.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Warn if running SQLite in a cloud environment (data will reset on redeploy)
if DATABASE_URL.startswith("sqlite") and os.getenv("RENDER"):
    logger.warning(
        "⚠️  WARNING: Using SQLite on Render. Data will be lost on every redeploy. "
        "Set DATABASE_URL to a PostgreSQL connection string for persistent storage."
    )

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Modern SQLAlchemy 2.x declarative base (replaces the deprecated declarative_base() call)."""
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
