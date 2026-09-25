from unittest.mock import MagicMock

import pytest

from app import database
from app.config import Settings


def test_engine_uses_mysql_without_connecting() -> None:
    engine = database.create_database_engine(Settings(_env_file=None))
    try:
        assert engine.dialect.name == "mysql"
        assert engine.dialect.driver == "pymysql"
        assert engine.hide_parameters is True
        assert engine.pool.checkedout() == 0
    finally:
        engine.dispose()


def test_session_rolls_back_on_error(monkeypatch: pytest.MonkeyPatch) -> None:
    factory = MagicMock()
    session = factory.return_value.__enter__.return_value
    monkeypatch.setattr(database, "SessionLocal", factory)
    monkeypatch.setattr(database, "get_engine", MagicMock())
    dependency = database.get_db()
    assert next(dependency) is session
    with pytest.raises(ValueError, match="business failure"):
        dependency.throw(ValueError("business failure"))
    session.rollback.assert_called_once()
    session.commit.assert_not_called()
    factory.return_value.__exit__.assert_called_once()
