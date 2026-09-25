from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database import get_engine
from app.main import app


@pytest.fixture
def database() -> MagicMock:
    engine = MagicMock()
    app.dependency_overrides[get_engine] = lambda: engine
    yield engine
    app.dependency_overrides.clear()


def test_health_executes_read_only_probe(database: MagicMock) -> None:
    connection = database.connect.return_value.__enter__.return_value
    connection.execute.return_value.scalar_one.return_value = 1
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
    assert response.headers["cache-control"] == "no-store"
    assert str(connection.execute.call_args.args[0]) == "SELECT 1"
    connection.commit.assert_not_called()


def test_health_returns_503_without_sql_details(database: MagicMock, caplog: pytest.LogCaptureFixture) -> None:
    database.connect.side_effect = OperationalError("SELECT private", {"password": "private-test"}, Exception("private-test"))
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}
    assert "private-test" not in response.text
    assert "private-test" not in caplog.text
    assert "SELECT private" not in caplog.text


def test_cors_allows_only_configured_frontend(database: MagicMock) -> None:
    with TestClient(app) as client:
        accepted = client.options("/api/health", headers={"Origin": "http://localhost:4200", "Access-Control-Request-Method": "GET"})
        refused = client.options("/api/health", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"})
    assert accepted.status_code == 200
    assert accepted.headers["access-control-allow-origin"] == "http://localhost:4200"
    assert refused.status_code == 400
    assert "access-control-allow-origin" not in refused.headers
