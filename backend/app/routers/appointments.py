from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.entities import Turno, Usuario
from app.schemas.appointments import AppointmentInput, AppointmentOutput, AppointmentUpdate, ScheduleOutput
from app.security import ActiveUser, Db, require_roles
from app.services import appointments

router = APIRouter(prefix='/api/turnos', tags=['turnos'])
Customer = Annotated[Usuario, Depends(require_roles('cliente'))]
Manager = Annotated[Usuario, Depends(require_roles('gerente', 'admin'))]


@router.get('/configuracion', response_model=ScheduleOutput)
def configuration(db: Db):
    return appointments.schedule(db)


@router.get('/disponibilidad', response_model=list[str])
def availability(vehiculo_id: int, fecha: date, db: Db):
    return appointments.available(db, vehiculo_id, fecha)


@router.get('/vendedores')
def sellers(db: Db, user: Manager):
    return [dict(row) for row in db.execute(select(Usuario.id, Usuario.nombre, Usuario.apellido).where(Usuario.role_id == 2, Usuario.activo == True)).mappings()]


@router.get('', response_model=list[AppointmentOutput], response_model_exclude_none=True)
def list_appointments(db: Db, user: ActiveUser):
    query = select(Turno).order_by(Turno.fecha_inicio.desc())
    if user.role_id == 1:
        query = query.where(Turno.cliente_id == user.id)
    elif user.role_id == 2:
        query = query.where(Turno.vendedor_id == user.id)
    return [appointments.output(db, row, staff=user.role_id != 1) for row in db.scalars(query)]


@router.post('', response_model=AppointmentOutput, response_model_exclude_none=True, status_code=201)
def create_appointment(payload: AppointmentInput, db: Db, user: Customer):
    return appointments.output(db, appointments.create(db, user, payload))


@router.patch('/{appointment_id}', response_model=AppointmentOutput, response_model_exclude_none=True)
def edit_appointment(appointment_id: int, payload: AppointmentUpdate, db: Db, user: ActiveUser):
    return appointments.output(db, appointments.edit(db, user, appointment_id, payload), staff=user.role_id != 1)
