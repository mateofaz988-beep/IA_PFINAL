"""Alta MANUAL de un administrador; nunca se ejecuta al iniciar la aplicación."""

from getpass import getpass

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal, get_engine
from app.schemas.auth import RegisterInput
from app.services.users import create_user


def main() -> int:
    try:
        nombre = input('Nombre: ').strip()
        apellido = input('Apellido: ').strip()
        email = input('Correo: ').strip()
        password = getpass('Contraseña (mínimo 12 caracteres): ')
        if password != getpass('Repite la contraseña: '):
            print('Las contraseñas no coinciden.')
            return 1
        payload = RegisterInput(nombre=nombre, apellido=apellido, email=email, password=password)
        with SessionLocal(bind=get_engine()) as session:
            create_user(session, payload, role_id=4)
    except ValidationError as error:
        print('Datos inválidos: ' + ', '.join('.'.join(str(part) for part in item['loc']) for item in error.errors()))
        return 1
    except HTTPException as error:
        print(error.detail)
        return 1
    except SQLAlchemyError:
        print('No se pudo crear la cuenta. Revisa la conexión MySQL.')
        return 1
    print('Administrador creado. Puedes iniciar sesión desde Angular.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
