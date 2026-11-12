"""Pydantic schemas for authentication and user accounts."""
import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime.datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


class RouteHistoryCreate(BaseModel):
    map_id: str
    start_node: str
    goal_node: str
    algorithm: str
    gbfs_cost: Optional[float] = None
    astar_cost: Optional[float] = None
    is_optimal: bool = True


class RouteHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    map_id: str
    start_node: str
    goal_node: str
    algorithm: str
    gbfs_cost: Optional[float] = None
    astar_cost: Optional[float] = None
    is_optimal: bool
    created_at: datetime.datetime
