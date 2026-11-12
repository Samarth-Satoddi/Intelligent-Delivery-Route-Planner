"""SQLAlchemy ORM models for Users, Refresh Tokens, and Route Calculations."""
import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .connection import Base


class User(Base):
    """User account model with role-based access control (ADMIN vs USER)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(512), nullable=False)
    role = Column(String(50), default="USER", nullable=False)  # "ADMIN" or "USER"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    route_history = relationship("RouteHistory", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """Persisted refresh token for secure token rotation and revocation."""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(256), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class RouteHistory(Base):
    """Audit log of calculated delivery routes per user."""
    __tablename__ = "route_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    map_id = Column(String(100), nullable=False)
    start_node = Column(String(100), nullable=False)
    goal_node = Column(String(100), nullable=False)
    algorithm = Column(String(50), nullable=False)
    gbfs_cost = Column(Float, nullable=True)
    astar_cost = Column(Float, nullable=True)
    is_optimal = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="route_history")

