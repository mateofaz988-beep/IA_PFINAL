from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.entities import Usuario
from app.schemas.auth import RegisterInput, UserOutput
from app.security import ROLES, dummy_hash, password_hasher, verify_password


def public_user(user: Usuario) -> UserOutput:
    return UserOutput(**{field: getattr(user, field) for field in UserOutput.model_fields if field != 'rol'}, rol=ROLES[user.role_id])


def commit_user(db: Session, user: Usuario) -> Usuario:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "El correo o documento ya está registrado.") from None
    db.refresh(user)
    return user


def create_user(db: Session, payload: RegisterInput, role_id: int = 1, temporary: bool = False) -> Usuario:
    data = payload.model_dump(exclude={'password', 'rol'})
    data['email'] = str(payload.email).casefold()
    data['documento'] = data['documento'] or None
    user = Usuario(**data, password_hash=password_hasher.hash(payload.password.get_secret_value()),
                   role_id=role_id, activo=True, debe_cambiar_password=temporary, token_version=0)
    db.add(user)
    return commit_user(db, user)


def authenticate(db: Session, email: str, password: str) -> Usuario:
    user = db.scalar(select(Usuario).where(Usuario.email == email.casefold()).with_for_update())
    valid = verify_password(password, user.password_hash if user else dummy_hash)
    if not valid or not user or not user.activo:
        raise HTTPException(401, "Correo o contraseña incorrectos.")
    user.ultimo_acceso = datetime.now(timezone.utc).replace(tzinfo=None)
    # Una única familia de sesión por cuenta; login/refresh invalidan tokens anteriores.
    user.token_version += 1
    return commit_user(db, user)
