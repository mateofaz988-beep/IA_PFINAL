"""Alembic sin URLs persistidas ni creación automática del esquema existente."""

from logging.config import fileConfig

from alembic import context
from alembic.util import CommandError

from app.config import settings
from app.database import Base, create_database_engine
from app import entities  # noqa: F401 - registrar el esquema inspeccionado

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Mientras no se hayan inspeccionado/importado los modelos reales, autogenerate
# interpretaría todas las tablas existentes como eliminaciones. Evitarlo.
if getattr(config.cmd_opts, "autogenerate", False) and not target_metadata.tables:
    raise CommandError("Inspecciona MySQL y registra los modelos ORM antes de autogenerar migraciones.")


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sqlalchemy_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_database_engine(settings)
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
