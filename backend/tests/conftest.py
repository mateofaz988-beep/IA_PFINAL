"""La suite unitaria no utiliza las credenciales ni la base real del usuario."""
import os
import pytest

# Se establecen antes de importar Settings. Solo afectan al proceso de pytest.
os.environ.update({
    "DB_HOST": "localhost",
    "DB_PORT": "3306",
    "DB_NAME": "unit_tests_not_connected",
    "DB_USER": "unit_test",
    "DB_PASSWORD": "unit-test-only",
    "DATABASE_URL": "",
    "JWT_SECRET": "unit-test-only-32-characters-secret-key",
    "CORS_ORIGINS": "http://localhost:4200",
    "REQUIRE_AUTH": "true",
})


def pytest_addoption(parser):
    parser.addoption('--mysql', action='store_true', help='Pruebas MySQL reales con rollback de todos los registros de prueba.')


@pytest.fixture
def mysql_session(request):
    if not request.config.getoption('--mysql'):
        pytest.skip('Usa --mysql para probar transacciones reales con rollback.')
    from dotenv import dotenv_values
    from sqlalchemy.orm import Session
    from app.config import BACKEND_DIR, Settings
    from app.database import create_database_engine
    values = {key.lower(): value for key, value in dotenv_values(BACKEND_DIR / '.env').items() if value is not None}
    config = Settings(_env_file=None, **values)
    engine = create_database_engine(config)
    with engine.connect() as connection:
        outer = connection.begin()
        with Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False) as session:
            try:
                yield session
            finally:
                session.close()
                outer.rollback()
    engine.dispose()


@pytest.fixture
def api(mysql_session):
    from fastapi.testclient import TestClient
    from app.database import get_db
    from app.main import app
    app.dependency_overrides[get_db] = lambda: mysql_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
