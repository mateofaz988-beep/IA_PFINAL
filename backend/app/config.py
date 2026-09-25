from pathlib import Path
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Configuración de la API, cargada desde variables de entorno / .env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    db_host: str = "localhost"
    db_port: int = Field(default=3306, ge=1, le=65535)
    db_name: str = "autoscan_motors"
    db_user: str = ""
    db_password: SecretStr = SecretStr("")
    database_url: SecretStr | None = None
    db_connect_timeout: int = Field(default=5, ge=1, le=60)
    db_pool_recycle: int = Field(default=1800, ge=60)
    jwt_secret: SecretStr = SecretStr("")
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    cookie_secure: bool = False
    storage_dir: Path = BACKEND_DIR / 'storage'
    upload_max_mb: int = Field(default=8, ge=1, le=25)

    cors_origins: str = "http://localhost:4200"
    google_application_credentials: str | None = None
    require_auth: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def empty_url_is_unset(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("cors_origins")
    @classmethod
    def explicit_origins_only(cls, value: str) -> str:
        origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("Configura al menos un origen CORS explícito.")
        for origin in origins:
            parsed = urlsplit(origin)
            if ("*" in origin or parsed.scheme not in {"http", "https"} or not parsed.netloc
                    or parsed.path or parsed.query or parsed.fragment or parsed.username):
                raise ValueError("CORS_ORIGINS debe contener orígenes HTTP(S) explícitos sin rutas.")
        return ",".join(origins)

    @model_validator(mode="after")
    def validate_database_configuration(self) -> "Settings":
        if self.database_url is not None:
            try:
                url = make_url(self.database_url.get_secret_value())
            except Exception:
                raise ValueError("DATABASE_URL no es una URL MySQL válida.") from None
            if url.drivername != "mysql+pymysql" or not url.database or not url.username:
                raise ValueError("DATABASE_URL requiere mysql+pymysql, usuario y nombre de base.")
        elif not self.db_user.strip() or not self.db_name.strip():
            raise ValueError("Configura DB_USER y DB_NAME en backend/.env o usa DATABASE_URL.")
        return self

    @property
    def sqlalchemy_url(self) -> URL:
        if self.database_url is not None:
            return make_url(self.database_url.get_secret_value())
        return URL.create(
            "mysql+pymysql", username=self.db_user,
            password=self.db_password.get_secret_value(), host=self.db_host,
            port=self.db_port, database=self.db_name, query={"charset": "utf8mb4"},
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
