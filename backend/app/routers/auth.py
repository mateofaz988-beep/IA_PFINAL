from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from sqlalchemy import select

from app.config import settings
from app.entities import Usuario
from app.schemas.auth import AuthOutput, ChangePasswordInput, LoginInput, ProfileInput, RegisterInput, UserOutput
from app.schemas.common import Message
from app.security import CurrentUser, Db, decode_token, password_hasher, token_for, validate_session, verify_password, jwt_key
from app.services.users import authenticate, commit_user, create_user, public_user

router = APIRouter(prefix='/api/auth', tags=['auth'])
COOKIE_NAME = 'autoscan_refresh'


def origin_check(request: Request) -> None:
    origin = request.headers.get('origin')
    if origin and origin not in settings.cors_origin_list:
        raise HTTPException(403, 'Origen no permitido.')


def auth_response(user: Usuario, response: Response) -> AuthOutput:
    response.headers['Cache-Control'] = 'no-store'
    response.set_cookie(COOKIE_NAME, token_for(user, 'refresh'), httponly=True, secure=settings.cookie_secure,
                        samesite='lax', path='/api/auth', max_age=settings.refresh_token_days * 86400)
    return AuthOutput(access_token=token_for(user), expires_in=settings.access_token_minutes * 60, user=public_user(user))


@router.post('/register', response_model=AuthOutput, status_code=201)
def register(payload: RegisterInput, db: Db, response: Response):
    jwt_key()
    return auth_response(create_user(db, payload), response)


@router.post('/login', response_model=AuthOutput)
def login(payload: LoginInput, db: Db, response: Response):
    jwt_key()
    return auth_response(authenticate(db, str(payload.email), payload.password.get_secret_value()), response)


@router.post('/refresh', response_model=AuthOutput)
def refresh(request: Request, response: Response, db: Db,
            autoscan_refresh: Annotated[str | None, Cookie()] = None):
    origin_check(request)
    if not autoscan_refresh:
        raise HTTPException(401, 'Inicia sesión para continuar.')
    claims = decode_token(autoscan_refresh, 'refresh')
    user = db.scalar(select(Usuario).where(Usuario.id == int(claims['sub'])).with_for_update())
    user = validate_session(user, claims)
    user.token_version += 1
    commit_user(db, user)
    return auth_response(user, response)


@router.post('/logout', response_model=Message)
def logout(request: Request, response: Response, db: Db, user: CurrentUser):
    origin_check(request)
    locked = db.scalar(select(Usuario).where(Usuario.id == user.id).with_for_update().execution_options(populate_existing=True))
    locked.token_version += 1
    db.commit()
    response.delete_cookie(COOKIE_NAME, path='/api/auth', httponly=True, secure=settings.cookie_secure, samesite='lax')
    response.headers['Cache-Control'] = 'no-store'
    return Message(message='Sesión cerrada.')


@router.get('/me', response_model=UserOutput)
def me(user: CurrentUser, response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return public_user(user)


@router.put('/me', response_model=UserOutput)
def update_profile(payload: ProfileInput, db: Db, user: CurrentUser):
    for key, value in payload.model_dump().items():
        setattr(user, key, value or None if key == 'documento' else value)
    return public_user(commit_user(db, user))


@router.post('/change-password', response_model=AuthOutput)
def change_password(payload: ChangePasswordInput, db: Db, user: CurrentUser, response: Response):
    user = db.scalar(select(Usuario).where(Usuario.id == user.id).with_for_update().execution_options(populate_existing=True))
    old, new = payload.current_password.get_secret_value(), payload.new_password.get_secret_value()
    if not verify_password(old, user.password_hash):
        raise HTTPException(400, 'La contraseña actual no coincide.')
    if old == new:
        raise HTTPException(422, 'La nueva contraseña debe ser diferente.')
    user.password_hash = password_hasher.hash(new)
    user.debe_cambiar_password = False
    user.token_version += 1
    return auth_response(commit_user(db, user), response)
