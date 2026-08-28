"""Verificación de usuarios autenticados con Firebase Auth.

El frontend Angular inicia sesión con Firebase Auth y adjunta el ID token
del usuario en el header `Authorization: Bearer <token>` de cada request.
Aquí lo validamos con el Admin SDK para saber quién llama al endpoint.
"""

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.config import settings

_app: firebase_admin.App | None = None


def _get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is None:
        try:
            _app = firebase_admin.get_app()
        except ValueError:
            # Usa GOOGLE_APPLICATION_CREDENTIALS si está configurado, o las
            # credenciales por defecto del entorno (útil en Cloud Run / GCP).
            _app = firebase_admin.initialize_app()
    return _app


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Dependencia de FastAPI que exige y valida un ID token de Firebase."""

    if not settings.require_auth:
        return {"uid": "dev-user", "email": "dev@example.com"}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el token de autenticación (Authorization: Bearer <token>).",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        _get_firebase_app()
        decoded_token = firebase_auth.verify_id_token(token)
    except Exception as exc:  # noqa: BLE001 - cualquier fallo de verificación es un 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        ) from exc

    return decoded_token
