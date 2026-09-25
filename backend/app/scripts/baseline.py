"""Registrar la baseline únicamente si el esquema real coincide con los modelos."""

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy.exc import SQLAlchemyError

from app import entities  # noqa: F401
from app.config import BACKEND_DIR
from app.database import Base, get_engine


def main() -> int:
    try:
        with get_engine().connect() as connection:
            context = MigrationContext.configure(connection, opts={"compare_type": True})
            current = context.get_current_revision()
            if current and current != "20260925_01":
                print("La base ya tiene otra revisión; no se modifica su historial.")
                return 1
            if compare_metadata(context, Base.metadata):
                print("El esquema difiere de los modelos. Revisar antes de registrar baseline.")
                return 1
        command.stamp(Config(str(BACKEND_DIR / "alembic.ini")), "20260925_01")
    except SQLAlchemyError:
        print("No se pudo comprobar o registrar la baseline. Revisa la conexión MySQL.")
        return 1
    print("Baseline 20260925_01 registrada; tablas de negocio conservadas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
