from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.entities import Usuario
from app.schemas.auth import EmployeeInput, UserManagementInput, UserOutput
from app.security import Db, ROLE_IDS, require_roles
from app.services.users import commit_user, create_user, public_user

router = APIRouter(prefix='/api/usuarios', tags=['usuarios'])
Admin = Annotated[Usuario, Depends(require_roles('admin'))]


@router.get('', response_model=list[UserOutput])
def users(db: Db, admin: Admin):
    return [public_user(user) for user in db.scalars(select(Usuario).order_by(Usuario.nombre)).all()]


@router.post('/empleados', response_model=UserOutput, status_code=201)
def create_employee(payload: EmployeeInput, db: Db, admin: Admin):
    return public_user(create_user(db, payload, ROLE_IDS[payload.rol], temporary=True))


@router.patch('/{user_id}', response_model=UserOutput)
def update_user(user_id: int, payload: UserManagementInput, db: Db, admin: Admin):
    # Evita bloqueos de la última cuenta administradora y cambios accidentales propios.
    if user_id == admin.id:
        raise HTTPException(409, 'Administra tus datos desde Mi cuenta; otro administrador debe cambiar tu acceso.')
    user = db.scalar(select(Usuario).where(Usuario.id == user_id).with_for_update())
    if not user:
        raise HTTPException(404, 'Usuario no encontrado.')
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(user, 'role_id' if key == 'rol' else key, ROLE_IDS[value] if key == 'rol' else value)
    user.token_version += 1
    return public_user(commit_user(db, user))
