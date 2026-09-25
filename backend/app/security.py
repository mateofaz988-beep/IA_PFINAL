"""JWT propio y RBAC verificado contra MySQL en cada solicitud."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.entities import Usuario

ROLES = {1: "cliente", 2: "vendedor", 3: "gerente", 4: "admin"}
ROLE_IDS = {name: key for key, name in ROLES.items()}
password_hasher = PasswordHash.recommended()
dummy_hash = password_hasher.hash("a-timing-only-value-never-used-as-a-credential")
bearer = HTTPBearer(auto_error=False)
Db = Annotated[Session, Depends(get_db)]


def jwt_key() -> str:
    key = settings.jwt_secret.get_secret_value()
    if len(key.encode()) < 32:
        raise HTTPException(503, "Configura JWT_SECRET con una clave aleatoria de al menos 32 bytes.")
    return key


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_hasher.verify(password, stored_hash)
    except Exception:
        # Un hash antiguo o inválido nunca permite iniciar sesión.
        return False


def token_for(user: Usuario, kind: str = "access") -> str:
    lifetime = timedelta(minutes=settings.access_token_minutes) if kind == "access" else timedelta(days=settings.refresh_token_days)
    return jwt.encode({"sub": str(user.id), "role": ROLES[user.role_id], "token_version": user.token_version,
                       "exp": datetime.now(timezone.utc) + lifetime, "aud": kind}, jwt_key(), algorithm="HS256")


def decode_token(token: str, kind: str = "access") -> dict:
    try:
        payload = jwt.decode(token, jwt_key(), algorithms=["HS256"], audience=kind,
                             options={"require": ["sub", "role", "token_version", "exp", "aud"]})
        if not str(payload['sub']).isdigit() or type(payload['token_version']) is not int:
            raise jwt.InvalidTokenError()
        return payload
    except jwt.InvalidTokenError:
        raise HTTPException(401, "La sesión no es válida o ha expirado.", headers={"WWW-Authenticate": "Bearer"}) from None


def validate_session(user: Usuario | None, claims: dict) -> Usuario:
    if not user or not user.activo or user.token_version != claims['token_version'] or ROLES.get(user.role_id) != claims['role']:
        raise HTTPException(401, "La sesión no es válida o ha expirado.")
    return user


def authenticated_user(db: Db, credential: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> Usuario:
    if credential is None:
        raise HTTPException(401, "Inicia sesión para continuar.", headers={"WWW-Authenticate": "Bearer"})
    claims = decode_token(credential.credentials)
    return validate_session(db.get(Usuario, int(claims['sub'])), claims)


CurrentUser = Annotated[Usuario, Depends(authenticated_user)]


def get_current_user(user: CurrentUser) -> Usuario:
    if user.debe_cambiar_password:
        raise HTTPException(403, "Debes cambiar tu contraseña temporal antes de continuar.")
    return user


ActiveUser = Annotated[Usuario, Depends(get_current_user)]


def require_roles(*roles: str):
    def dependency(user: ActiveUser) -> Usuario:
        if ROLES.get(user.role_id) not in roles:
            raise HTTPException(403, "No tienes permiso para realizar esta operación.")
        return user
    return dependency
