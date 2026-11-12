"""Comprehensive unit and integration tests for Authentication and Authorization."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.connection import Base, get_db
from api import app
from database.models import User

# In-memory SQLite for isolated test runs
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_user_registration(client):
    """Test successful user registration with USER role default."""
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Delivery Student",
            "email": "student@campus.edu",
            "password": "Password123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student@campus.edu"
    assert data["role"] == "USER"
    assert "hashed_password" not in data


def test_duplicate_registration_rejected(client):
    """Test that duplicate registration with the same email is rejected with 400."""
    client.post(
        "/api/auth/register",
        json={
            "full_name": "First User",
            "email": "duplicate@campus.edu",
            "password": "Password123!",
        },
    )
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Second User",
            "email": "duplicate@campus.edu",
            "password": "Password123!",
        },
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_password_length_validation(client):
    """Test that weak passwords (< 8 chars) are rejected."""
    res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Short Password",
            "email": "short@campus.edu",
            "password": "short",
        },
    )
    assert res.status_code == 422 or res.status_code == 400


def test_valid_login_and_me_endpoint(client):
    """Test login with valid credentials and fetching profile via /api/auth/me."""
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Test User",
            "email": "test@campus.edu",
            "password": "ValidPassword123!",
        },
    )

    login_res = client.post(
        "/api/auth/login",
        json={
            "email": "test@campus.edu",
            "password": "ValidPassword123!",
        },
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    access_token = token_data["access_token"]
    assert access_token is not None

    # Test /api/auth/me with Bearer token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "test@campus.edu"
    assert me_data["role"] == "USER"


def test_invalid_login_wrong_password(client):
    """Test login rejection on wrong password."""
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Wrong Pass User",
            "email": "wrongpass@campus.edu",
            "password": "CorrectPassword123!",
        },
    )
    res = client.post(
        "/api/auth/login",
        json={
            "email": "wrongpass@campus.edu",
            "password": "WrongPassword456!",
        },
    )
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower()


def test_protected_route_without_token(client):
    """Test that accessing /api/auth/me without a token raises 401."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_refresh_token_rotation_and_revocation(client):
    """Test refresh token rotation on /api/auth/refresh and logout revocation."""
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Refresh Tester",
            "email": "refresh@campus.edu",
            "password": "Password123!",
        },
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "refresh@campus.edu", "password": "Password123!"},
    )
    cookies = login_res.cookies

    # Rotate token via /api/auth/refresh
    refresh_res = client.post("/api/auth/refresh", cookies=cookies)
    assert refresh_res.status_code == 200
    new_token = refresh_res.json()["access_token"]
    assert new_token is not None

    # Logout to revoke
    logout_res = client.post("/api/auth/logout", cookies=refresh_res.cookies)
    assert logout_res.status_code == 200

    # Old refresh token should now fail
    failed_refresh = client.post("/api/auth/refresh", cookies=cookies)
    assert failed_refresh.status_code == 401


def test_admin_role_authorization(client, test_db):
    """Test that regular USER cannot access admin endpoints while ADMIN can."""
    # Register regular user
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Regular User",
            "email": "regular@campus.edu",
            "password": "Password123!",
        },
    )
    user_login = client.post(
        "/api/auth/login",
        json={"email": "regular@campus.edu", "password": "Password123!"},
    )
    user_token = user_login.json()["access_token"]

    # Bootstrap an admin
    client.post(
        "/api/auth/bootstrap-admin",
        params={
            "admin_secret": "campus_admin_bootstrap_secret_key_2026",
            "email": "boss@campus.edu",
            "password": "AdminPassword123!",
        },
    )
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "boss@campus.edu", "password": "AdminPassword123!"},
    )
    admin_token = admin_login.json()["access_token"]

    # Attempt admin action with regular user token
    user_attempt = client.post(
        "/api/admin/maps/campus_map/node",
        json={"id": "test_node", "name": "Test Node", "x": 0.0, "y": 0.0},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert user_attempt.status_code == 403

    # Attempt admin action with admin token
    try:
        admin_attempt = client.post(
            "/api/admin/maps/campus_map/node",
            json={"id": "test_node_admin", "name": "Admin Node", "x": 10.0, "y": 10.0, "type": "junction"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert admin_attempt.status_code == 200
    finally:
        # Revert campus_map to clean state to keep other tests isolated
        import subprocess
        subprocess.run(["git", "checkout", "intelligent-delivery-route-planner/data/campus_map.json"], check=False)
