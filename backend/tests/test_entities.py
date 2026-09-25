from sqlalchemy.dialects import mysql
from sqlalchemy.schema import CreateTable

from app import entities
from app.database import Base


def test_models_preserve_existing_schema_constraints():
    assert len(Base.metadata.tables) == 14
    assert entities.Usuario.__table__.c.role_id.server_default.arg.text == "'1'"
    assert entities.Vehiculo.__table__.c.cars196_clase_id.nullable
    assert entities.Vehiculo.__table__.c.precio.type.scale == 2
    ddl = str(CreateTable(entities.Turno.__table__).compile(dialect=mysql.dialect()))
    unique = next(index for index in entities.Turno.__table__.indexes if index.name == 'uq_turno_cliente_vehiculo_inicio')
    assert unique.unique
    assert list(unique.columns.keys()) == ['cliente_id', 'vehiculo_id', 'fecha_inicio']
    assert 'chk_turno_fechas' in ddl
    assert 'FOREIGN KEY' in ddl
