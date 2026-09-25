import pytest
from pydantic import ValidationError

from app.config import Settings


def test_url_preserves_special_characters_and_hides_password() -> None:
    config = Settings(_env_file=None, db_user="test", db_password="test@:/#%word")
    assert config.sqlalchemy_url.password == "test@:/#%word"
    assert "test@:/#%word" not in str(config.sqlalchemy_url)
    assert "test@:/#%word" not in repr(config)
    assert config.sqlalchemy_url.drivername == "mysql+pymysql"


def test_database_url_has_precedence_and_is_secret() -> None:
    config = Settings(_env_file=None, database_url="mysql+pymysql://test:private-test@localhost/existing")
    assert config.sqlalchemy_url.database == "existing"
    assert "private-test" not in repr(config)


@pytest.mark.parametrize("url", ["sqlite:///invented.db", "postgresql://test:pw@localhost/test", "not-a-url"])
def test_rejects_other_database_drivers(url: str) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url=url)


def test_invalid_url_error_does_not_expose_secret() -> None:
    with pytest.raises(ValidationError) as captured:
        Settings(_env_file=None, database_url="not-a-url-with-test-secret")
    assert "not-a-url-with-test-secret" not in str(captured.value)


@pytest.mark.parametrize("origins", ["*", "http://localhost:4200,*", "https://site.test/path", ""])
def test_rejects_unsafe_or_invalid_cors(origins: str) -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_origins=origins)


def test_normalizes_explicit_cors_origins() -> None:
    config = Settings(_env_file=None, cors_origins="http://localhost:4200/, https://app.example.test")
    assert config.cors_origin_list == ["http://localhost:4200", "https://app.example.test"]
