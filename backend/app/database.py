"""Infraestructura SQLAlchemy. No crea ni modifica tablas al importar o arrancar."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import Settings, settings


class Base(DeclarativeBase):
    """Los modelos de fase 2 se definirán después de inspeccionar el esquema real."""


def create_database_engine(config: Settings) -> Engine:
    return create_engine(
        config.sqlalchemy_url,
        pool_pre_ping=True,
        pool_recycle=config.db_pool_recycle,
        pool_size=5,
        max_overflow=5,
        pool_timeout=10,
        hide_parameters=True,
        connect_args={
            "charset": "utf8mb4",
            "connect_timeout": config.db_connect_timeout,
            "read_timeout": config.db_connect_timeout,
            "write_timeout": config.db_connect_timeout,
        },
    )


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Crear el pool es perezoso; no prueba credenciales ni ejecuta DDL."""
    return create_database_engine(settings)


SessionLocal = sessionmaker(class_=Session, expire_on_commit=False, autoflush=False)


def get_db() -> Iterator[Session]:
    """La operación de negocio decide cuándo confirmar su transacción."""
    with SessionLocal(bind=get_engine()) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
