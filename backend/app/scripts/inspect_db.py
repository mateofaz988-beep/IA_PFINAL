"""Inspección de solo lectura del esquema; no incluye datos de usuarios ni secretos."""

import json
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.config import BACKEND_DIR
from app.database import get_engine


def export_schema() -> Path:
    engine = get_engine()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1")).scalar_one()
            inspector = inspect(connection)
            quote = connection.dialect.identifier_preparer.quote
            tables: dict[str, object] = {}
            for table in inspector.get_table_names():
                identifier = quote(table)
                tables[table] = {
                    "columns": inspector.get_columns(table),
                    "primary_key": inspector.get_pk_constraint(table),
                    "foreign_keys": inspector.get_foreign_keys(table),
                    "indexes": inspector.get_indexes(table),
                    "unique_constraints": inspector.get_unique_constraints(table),
                    "check_constraints": inspector.get_check_constraints(table),
                    "create_sql": connection.execute(text(f"SHOW CREATE TABLE {identifier}")).one()[1],
                    "row_count": connection.execute(text(f"SELECT COUNT(*) FROM {identifier}")).scalar_one(),
                }
            result = {"captured_at": datetime.now(timezone.utc).isoformat(), "tables": tables}
        directory = BACKEND_DIR / "backups"
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"schema-{datetime.now(timezone.utc):%Y%m%d-%H%M%S-%f}.json"
        path.write_text(json.dumps(result, default=str, indent=2, ensure_ascii=False), encoding="utf-8")
        return path
    finally:
        engine.dispose()


def main() -> int:
    try:
        path = export_schema()
    except SQLAlchemyError as error:
        arguments = getattr(getattr(error, "orig", None), "args", ())
        code = arguments[0] if arguments and isinstance(arguments[0], int) else None
        print(json.dumps({"connected": False, "mysql_error_code": code}))
        return 1
    print(json.dumps({"connected": True, "schema_file": str(path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
