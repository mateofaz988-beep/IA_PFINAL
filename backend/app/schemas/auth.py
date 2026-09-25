from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, SecretStr

from app.schemas.common import InputModel, OutputModel

RoleName = Literal["cliente", "vendedor", "gerente", "admin"]


class RegisterInput(InputModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(default="", max_length=100)
    email: EmailStr = Field(max_length=180)
    password: SecretStr = Field(min_length=12, max_length=128)
    telefono: str | None = Field(default=None, max_length=30)
    documento: str | None = Field(default=None, max_length=30)


class EmployeeInput(RegisterInput):
    rol: Literal["vendedor", "gerente"]


class LoginInput(InputModel):
    email: EmailStr = Field(max_length=180)
    password: SecretStr = Field(min_length=1, max_length=128)


class ChangePasswordInput(InputModel):
    current_password: SecretStr = Field(min_length=1, max_length=128)
    new_password: SecretStr = Field(min_length=12, max_length=128)


class ProfileInput(InputModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(default="", max_length=100)
    telefono: str | None = Field(default=None, max_length=30)
    documento: str | None = Field(default=None, max_length=30)


class UserManagementInput(InputModel):
    rol: RoleName | None = None
    activo: bool | None = None
    debe_cambiar_password: bool | None = None


class UserOutput(OutputModel):
    id: int
    nombre: str
    apellido: str | None
    email: str
    telefono: str | None
    documento: str | None
    role_id: int
    rol: RoleName
    activo: bool
    debe_cambiar_password: bool
    created_at: datetime


class AuthOutput(OutputModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOutput
