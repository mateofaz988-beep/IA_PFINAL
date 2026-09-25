from datetime import datetime
from typing import Literal
from pydantic import Field
from app.schemas.common import InputModel, OutputModel

AppointmentState = Literal['pendiente', 'confirmado', 'atendido', 'cancelado', 'no_asistio']


class AppointmentInput(InputModel):
    vehiculo_id: int = Field(ge=1)
    fecha_inicio: datetime
    notas_cliente: str = Field(default='', max_length=2000)


class AppointmentUpdate(InputModel):
    vendedor_id: int | None = Field(default=None, ge=1)
    estado: AppointmentState | None = None
    notas_internas: str | None = Field(default=None, max_length=4000)
    motivo_cancelacion: str | None = Field(default=None, max_length=500)


class AppointmentOutput(OutputModel):
    id: int
    cliente_id: int
    vehiculo_id: int
    vendedor_id: int | None
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: AppointmentState
    notas_cliente: str | None
    notas_internas: str | None = None
    motivo_cancelacion: str | None
    vehiculo: str
    cliente: str
    vendedor: str | None


class ScheduleOutput(OutputModel):
    duracion_turno_minutos: int
    hora_apertura: str
    hora_cierre: str
    timezone: str = 'America/Guayaquil'
