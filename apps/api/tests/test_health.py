import os

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_returns_service_info():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "ramxworkspace-api"


def test_cors_allows_local_and_production_origins():
    origins = [
        "http://localhost:3000",
        "https://ramxworkspace.vercel.app",
    ]
    for origin in origins:
        response = client.get(
            "/health",
            headers={"Origin": origin},
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_cors_rejects_unknown_origin():
    response = client.get(
        "/health",
        headers={"Origin": "https://evil.example.com"},
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_come_from_environment():
    expected = [o.strip() for o in os.environ.get("FRONTEND_URL", "").split(",") if o.strip()]
    if expected:
        from app.core.config import Settings

        assert Settings().cors_origins == expected
