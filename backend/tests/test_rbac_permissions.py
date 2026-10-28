import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.security import create_access_token
from app.database import SessionLocal
from app.models.user import User

client = TestClient(app)

ROLE_MAP = {
    "ADMIN": 1,
    "STAFF": 2,
    "ACCOUNTANT": 3,
    "TENANT": 4,
}

def get_token_for_role(role_code: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.role_id == ROLE_MAP[role_code]).first()
        if user:
            return create_access_token(user.id, user.role_id)
        # fallback dummy user_id
        return create_access_token(999, ROLE_MAP[role_code])
    finally:
        db.close()

def test_accountant_cannot_create_apartment():
    token = get_token_for_role("ACCOUNTANT")
    resp = client.post(
        "/api/v1/apartments",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "building_id": 1,
            "room_number": "P.999",
            "floor": 9,
            "area_sqm": 50,
            "price": 8000000,
            "bedrooms": 1,
            "bathrooms": 1,
            "view_direction": "Đông Nam"
        }
    )
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"

def test_accountant_can_view_apartments():
    token = get_token_for_role("ACCOUNTANT")
    resp = client.get(
        "/api/v1/apartments",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200

def test_accountant_can_read_bookings():
    token = get_token_for_role("ACCOUNTANT")
    resp = client.get(
        "/api/v1/bookings",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200

def test_staff_cannot_generate_monthly_receivables():
    token = get_token_for_role("STAFF")
    resp = client.post(
        "/api/v1/receivables/generate-monthly",
        headers={"Authorization": f"Bearer {token}"},
        json={"month": 11, "year": 2026}
    )
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}: {resp.text}"

def test_staff_can_view_debt_ledgers():
    token = get_token_for_role("STAFF")
    resp = client.get(
        "/api/v1/debt-ledgers",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
