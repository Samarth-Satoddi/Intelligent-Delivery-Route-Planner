"""Security utilities: Argon2 password hashing and JWT token handling."""
import os
import secrets
import hashlib
import datetime
from typing import Dict, Any, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

# Security Configuration from Environment
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "campus_delivery_secret_key_change_in_production_9f83a2c")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Initialize Argon2 Password Hasher
_pwd_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return _pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    try:
        return _pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a cryptographically signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow(), "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except (jwt.PyJWTError, jwt.ExpiredSignatureError):
        return None


def generate_refresh_token_pair() -> tuple[str, str]:
    """Generate a high-entropy random refresh token and its SHA256 hash for DB storage.

    Returns:
        tuple[raw_token, token_hash]: The raw token is sent to the client, the hash is saved in DB.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_token_sha256(raw_token)
    return raw_token, token_hash


def hash_token_sha256(token: str) -> str:
    """Compute SHA256 digest of a token for secure database indexing."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

