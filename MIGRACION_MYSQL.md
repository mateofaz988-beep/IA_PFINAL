# Migración de AutoScan Motors a MySQL

Estado del 25 de septiembre de 2026: conexión MySQL real comprobada;
`GET /api/health` devuelve 200 y `database=connected`.

## Fases implementadas

1. SQLAlchemy, PyMySQL, sesiones y comprobación real de disponibilidad.
2. Inspección de 14 tablas; modelos en `backend/app/entities.py`, contratos
   públicos en `schemas/` y baseline Alembic `20260925_01`. La comparación
   `alembic check` no detectó cambios. Se conservó el esquema existente.
3. JWT y Argon2: registro, login, refresh, logout, perfil y cambio de contraseña;
   comprobación de rol, estado y versión de sesión en MySQL; empleados solo por
   admin. Script manual `python -m app.scripts.create_admin`, no ejecutado.
4. Angular utiliza autenticación REST, token de acceso en memoria y cookie
   HttpOnly para renovar la sesión. Guards, interceptor y cambio de contraseña
   temporal obligatoria. Una familia de sesión por cuenta: nuevo login, refresh,
   cambio de contraseña o gestión del acceso invalidan tokens anteriores.
5. API de inventario para vendedor, gerente y admin; ocultación lógica,
   características, precios, imágenes JPG/PNG/WebP con validación del contenido,
   tamaño y nombre generado. Vehículos hasta 2012; Cars196 opcional.
6. Diez fichas académicas existentes cargadas en MySQL con sus fotografías.
   El seed no modifica inventario si ya contiene vehículos.
7. Catálogo Angular conectado a FastAPI/MySQL, conservando el diseño, filtros,
   ordenamiento y detalle. Sin fallback a otra fuente de inventario.

## Validación más reciente

- Backend: 31 pruebas, incluidas transacciones MySQL reales con rollback.
- Frontend: 21 pruebas.
- Compilación de Angular comprobada por fase.
- Pruebas de integración: `cd backend` y `.\.venv\Scripts\python.exe -m pytest --mysql`.
- Pruebas sin MySQL: `.\.venv\Scripts\python.exe -m pytest` (integración omitida).
- La suite no crea bases ni tablas y revierte registros de prueba; MySQL puede
  consumir IDs autoincrementales durante las pruebas aunque luego se reviertan.

## Trabajo pendiente

Favoritos, turnos con control de concurrencia, carrito, checkout académico,
órdenes/facturas PDF, SMTP, integración IA con catálogo, paneles completos,
perfil cliente y retirada final de dependencias Firebase. Hay pantallas antiguas
en proceso de sustitución; la migración completa todavía no está terminada.

## Inicio local

Desde `backend`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Desde la raíz, en otra terminal: `npm.cmd start`.

Guardar credenciales solo en `backend/.env`; `.env.example` contiene ejemplos
públicos. No se han reemplazado los secretos locales. Reiniciar el backend tras
cambiar `.env`. No se ha creado ningún administrador automáticamente.

Referencias técnicas: [FastAPI JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/),
[Alembic](https://alembic.sqlalchemy.org/en/latest/api/commands.html),
[transacciones de SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/session_api.html).
