from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.entities import Configuracion, Turno, Usuario, Vehiculo
from app.schemas.appointments import AppointmentInput, AppointmentOutput, AppointmentUpdate, ScheduleOutput
from app.services.vehicles import get_vehicle

ZONE = ZoneInfo('America/Guayaquil')
BLOCKING = ('pendiente', 'confirmado')


def local_now() -> datetime:
    return datetime.now(ZONE).replace(tzinfo=None)


def schedule(db: Session) -> ScheduleOutput:
    values = dict(db.execute(select(Configuracion.clave, Configuracion.valor).where(Configuracion.clave.in_(('duracion_turno_minutos', 'hora_apertura', 'hora_cierre')))).all())
    try:
        duration = int(values['duracion_turno_minutos'])
        opening, closing = time.fromisoformat(values['hora_apertura']), time.fromisoformat(values['hora_cierre'])
        if not 5 <= duration <= 240 or opening >= closing:
            raise ValueError()
    except (KeyError, ValueError):
        raise HTTPException(503, 'La configuración de turnos requiere revisión administrativa.') from None
    return ScheduleOutput(duracion_turno_minutos=duration, hora_apertura=opening.isoformat(timespec='minutes'), hora_cierre=closing.isoformat(timespec='minutes'))


def interval(db: Session, start: datetime) -> tuple[datetime, datetime]:
    if start.tzinfo:
        start = start.astimezone(ZONE).replace(tzinfo=None)
    config = schedule(db)
    end = start + timedelta(minutes=config.duracion_turno_minutos)
    opening = datetime.combine(start.date(), time.fromisoformat(config.hora_apertura))
    closing = datetime.combine(start.date(), time.fromisoformat(config.hora_cierre))
    if start <= local_now():
        raise HTTPException(422, 'Selecciona una fecha y hora futuras.')
    if start < opening or end > closing or (start - opening).total_seconds() % (config.duracion_turno_minutos * 60):
        raise HTTPException(422, 'Selecciona uno de los horarios disponibles de la concesionaria.')
    return start, end


def conflict(db: Session, vehicle_id: int, start: datetime, end: datetime, seller_id: int | None = None, exclude: int | None = None) -> None:
    query = select(Turno.id).where(Turno.estado.in_(BLOCKING), Turno.fecha_inicio < end, Turno.fecha_fin > start)
    if exclude:
        query = query.where(Turno.id != exclude)
    # Lecturas con bloqueo: ven los commits recientes incluso con REPEATABLE READ.
    if db.scalar(query.where(Turno.vehiculo_id == vehicle_id).limit(1).with_for_update()):
        raise HTTPException(409, 'El vehículo ya tiene un turno en ese horario.')
    if seller_id and db.scalar(query.where(Turno.vendedor_id == seller_id).limit(1).with_for_update()):
        raise HTTPException(409, 'El vendedor ya tiene un turno en ese horario.')


def output(db: Session, row: Turno, staff: bool = False) -> AppointmentOutput:
    vehicle, client = db.get(Vehiculo, row.vehiculo_id), db.get(Usuario, row.cliente_id)
    seller = db.get(Usuario, row.vendedor_id) if row.vendedor_id else None
    fields = {key: getattr(row, key) for key in AppointmentOutput.model_fields if hasattr(row, key)}
    fields['notas_internas'] = row.notas_internas if staff else None
    return AppointmentOutput(**fields, vehiculo=f'{vehicle.marca} {vehicle.modelo} · {vehicle.codigo}',
                             cliente=f'{client.nombre} {client.apellido or ""}'.strip(), vendedor=f'{seller.nombre} {seller.apellido or ""}'.strip() if seller else None)


def commit(db: Session, row: Turno) -> Turno:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Ese turno ya existe o acaba de cambiar. Actualiza la agenda.') from None
    db.refresh(row)
    return row


def create(db: Session, user: Usuario, payload: AppointmentInput) -> Turno:
    start, end = interval(db, payload.fecha_inicio)
    vehicle = get_vehicle(db, payload.vehiculo_id, lock=True)
    if not vehicle.activo or vehicle.estado not in ('disponible', 'reservado'):
        raise HTTPException(409, 'El vehículo no admite visitas en este momento.')
    conflict(db, vehicle.id, start, end)
    row = Turno(cliente_id=user.id, vehiculo_id=vehicle.id, fecha_inicio=start, fecha_fin=end, estado='pendiente', notas_cliente=payload.notas_cliente)
    db.add(row)
    return commit(db, row)


def edit(db: Session, user: Usuario, appointment_id: int, payload: AppointmentUpdate) -> Turno:
    initial = db.get(Turno, appointment_id)
    if initial is None or (user.role_id == 1 and initial.cliente_id != user.id) or (user.role_id == 2 and initial.vendedor_id != user.id):
        raise HTTPException(404, 'Turno no encontrado.')
    # Orden compartido con creación y checkout: vehículo antes de turno/vendedor.
    vehicle = get_vehicle(db, initial.vehiculo_id, lock=True)
    row = db.scalar(select(Turno).where(Turno.id == appointment_id).with_for_update().execution_options(populate_existing=True))
    supplied = payload.model_fields_set
    if user.role_id == 1 and (payload.estado != 'cancelado' or supplied - {'estado', 'motivo_cancelacion'}):
        raise HTTPException(403, 'Solo puedes cancelar tus propios turnos.')
    if user.role_id == 2 and 'vendedor_id' in supplied:
        raise HTTPException(403, 'La asignación de vendedores corresponde a gerencia o administración.')
    if row.estado not in BLOCKING:
        raise HTTPException(409, 'Este turno ya está finalizado y no puede modificarse.')
    state = payload.estado or row.estado
    seller_id = payload.vendedor_id if 'vendedor_id' in supplied else row.vendedor_id
    if seller_id:
        seller = db.scalar(select(Usuario).where(Usuario.id == seller_id).with_for_update().execution_options(populate_existing=True))
        if not seller or seller.role_id != 2 or not seller.activo:
            raise HTTPException(422, 'Selecciona un vendedor activo.')
    if state == 'confirmado' and not seller_id:
        raise HTTPException(422, 'Asigna un vendedor antes de confirmar.')
    if state in BLOCKING:
        if not vehicle.activo or vehicle.estado not in ('disponible', 'reservado'):
            raise HTTPException(409, 'El vehículo ya no está disponible para visitas.')
        conflict(db, row.vehiculo_id, row.fecha_inicio, row.fecha_fin, seller_id, row.id)
    row.vendedor_id, row.estado = seller_id, state
    if payload.notas_internas is not None:
        row.notas_internas = payload.notas_internas
    if payload.motivo_cancelacion is not None:
        row.motivo_cancelacion = payload.motivo_cancelacion
    return commit(db, row)


def available(db: Session, vehicle_id: int, day: date) -> list[str]:
    vehicle = get_vehicle(db, vehicle_id, public=True)
    if vehicle.estado not in ('disponible', 'reservado'):
        return []
    config = schedule(db)
    start = datetime.combine(day, time.fromisoformat(config.hora_apertura))
    close = datetime.combine(day, time.fromisoformat(config.hora_cierre))
    rows = list(db.scalars(select(Turno).where(Turno.vehiculo_id == vehicle.id, Turno.estado.in_(BLOCKING), Turno.fecha_inicio < close, Turno.fecha_fin > start)))
    values = []
    step = timedelta(minutes=config.duracion_turno_minutos)
    while start + step <= close:
        if start > local_now() and not any(start < row.fecha_fin and start + step > row.fecha_inicio for row in rows):
            values.append(start.isoformat(timespec='minutes'))
        start += step
    return values
