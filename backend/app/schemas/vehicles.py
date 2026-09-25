from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field, field_validator
from app.schemas.common import InputModel, OutputModel

VehicleState = Literal['disponible', 'reservado', 'vendido', 'mantenimiento', 'oculto']


class VehicleInput(InputModel):
    marca: str = Field(min_length=1, max_length=100)
    modelo: str = Field(min_length=1, max_length=150)
    version: str | None = Field(default=None, max_length=150)
    anio: int = Field(ge=1886, le=2012)
    precio: Decimal = Field(ge=0, le=9999999999, decimal_places=2)
    kilometraje: int = Field(default=0, ge=0, le=4294967295)
    vin: str | None = Field(default=None, max_length=50)
    combustible: str | None = Field(default=None, max_length=50)
    transmision: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=60)
    motor: str | None = Field(default=None, max_length=100)
    categoria: str | None = Field(default=None, max_length=80)
    descripcion: str | None = Field(default=None, max_length=10000)
    estado: VehicleState = 'disponible'
    destacado: bool = False
    cars196_clase_id: int | None = Field(default=None, ge=1)
    caracteristicas: list[str] = Field(default_factory=list, max_length=50)

    @field_validator('caracteristicas')
    @classmethod
    def features(cls, values: list[str]) -> list[str]:
        values = [value.strip() for value in values if value.strip()]
        if any(len(value) > 255 for value in values):
            raise ValueError('Cada característica admite hasta 255 caracteres.')
        # La collation de MySQL no distingue mayúsculas ni acentos.
        import unicodedata
        seen, result = set(), []
        for value in values:
            key = ''.join(char for char in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(char))
            if key not in seen:
                seen.add(key)
                result.append(value)
        return result


class VehicleStateInput(InputModel):
    estado: VehicleState


class ImageOutput(OutputModel):
    id: int
    ruta: str
    nombre_original: str | None
    alt_text: str | None
    orden: int
    es_principal: bool


class ImageInput(InputModel):
    alt_text: str = Field(default='', max_length=255)
    orden: int = Field(default=0, ge=0, le=65535)
    es_principal: bool = False


class VehicleOutput(VehicleInput, OutputModel):
    id: int
    codigo: str
    activo: bool
    datos_demo: bool
    imagen_principal: str | None
    imagenes: list[ImageOutput]
    referencia_cars196: str | None = None
    created_at: datetime
    updated_at: datetime
