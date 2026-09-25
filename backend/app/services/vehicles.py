from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.entities import Cars196Clase, OrdenItem, Vehiculo, VehiculoCaracteristica, VehiculoImagen
from app.schemas.vehicles import VehicleInput, VehicleOutput

PUBLIC_STATES = ('disponible', 'reservado', 'vendido')


def vehicle_query(public: bool = True):
    query = select(Vehiculo)
    return query.where(Vehiculo.activo == True, Vehiculo.estado.in_(PUBLIC_STATES)) if public else query


def get_vehicle(db: Session, vehicle_id: int, public: bool = False, lock: bool = False) -> Vehiculo:
    query = vehicle_query(public).where(Vehiculo.id == vehicle_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    vehicle = db.scalar(query)
    if not vehicle:
        raise HTTPException(404, 'Vehículo no encontrado.')
    return vehicle


def public_vehicle(db: Session, vehicle: Vehiculo) -> VehicleOutput:
    fields = {name: getattr(vehicle, name) for name in VehicleOutput.model_fields if hasattr(vehicle, name)}
    fields['caracteristicas'] = list(db.scalars(select(VehiculoCaracteristica.caracteristica).where(VehiculoCaracteristica.vehiculo_id == vehicle.id).order_by(VehiculoCaracteristica.id)))
    fields['imagenes'] = list(db.scalars(select(VehiculoImagen).where(VehiculoImagen.vehiculo_id == vehicle.id).order_by(VehiculoImagen.orden, VehiculoImagen.id)))
    fields['referencia_cars196'] = db.scalar(select(Cars196Clase.label).where(Cars196Clase.id == vehicle.cars196_clase_id)) if vehicle.cars196_clase_id else None
    return VehicleOutput(**fields)


def commit_vehicle(db: Session, vehicle: Vehiculo) -> Vehiculo:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'El VIN o código ya existe, o los datos referenciados no son válidos.') from None
    db.refresh(vehicle)
    return vehicle


def validate_state(db: Session, vehicle: Vehiculo, state: str) -> None:
    if state != 'vendido' and db.scalar(select(OrdenItem.id).where(OrdenItem.vehiculo_id == vehicle.id).limit(1)):
        raise HTTPException(409, 'Un vehículo incluido en una compra no puede volver a ponerse a la venta.')


def save_vehicle(db: Session, payload: VehicleInput, user_id: int | None, vehicle_id: int | None = None, demo: bool = False) -> Vehiculo:
    if payload.cars196_clase_id and not db.get(Cars196Clase, payload.cars196_clase_id):
        raise HTTPException(422, 'La clase Cars196 no existe; puedes dejarla sin asignar.')
    vehicle = get_vehicle(db, vehicle_id, lock=True) if vehicle_id else Vehiculo(codigo='TMP-' + uuid4().hex[:24], creado_por=user_id, datos_demo=demo, activo=True)
    if vehicle_id:
        validate_state(db, vehicle, payload.estado)
    values = payload.model_dump(exclude={'caracteristicas'})
    values['vin'] = values['vin'] or None
    for key, value in values.items():
        setattr(vehicle, key, value)
    vehicle.actualizado_por = user_id
    db.add(vehicle)
    try:
        db.flush()
        if vehicle_id is None:
            vehicle.codigo = f'AUTO-{vehicle.id:06d}'
        db.execute(delete(VehiculoCaracteristica).where(VehiculoCaracteristica.vehiculo_id == vehicle.id))
        db.add_all(VehiculoCaracteristica(vehiculo_id=vehicle.id, caracteristica=value) for value in payload.caracteristicas)
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'El VIN o código ya está registrado.') from None
    return vehicle
