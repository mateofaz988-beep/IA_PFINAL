# Baseline del esquema existente

La base `autoscan_motors` ya existe. No se inventa una revisión inicial ni
se ejecutan `create_all`, migraciones o `stamp` durante el arranque.

La revisión `20260925_01` representa las 14 tablas inspeccionadas el 25-09-2026.
Se registró después de comprobar que no había diferencias con los modelos.
No recrea las tablas ni permite eliminarlas mediante downgrade.

Para registrar esta baseline en otra copia del mismo esquema:

1. Ejecutar `python -m app.scripts.inspect_db` desde `backend` y revisar el
   esquema real, las restricciones y el número de registros de cada tabla.
2. Crear los modelos que representen ese esquema y registrar su metadata.
3. Definir una revisión baseline coherente con el esquema comprobado.
4. Registrar la baseline con Alembic solo después de revisar que corresponde
   a esa base; `stamp` registra una revisión, no ejecuta su DDL.
5. Revisar las migraciones futuras antes de ejecutarlas. Una migración que
   elimine o transforme datos requiere la autorización indicada por el usuario.

Fuente: [comandos Alembic](https://alembic.sqlalchemy.org/en/latest/api/commands.html).
