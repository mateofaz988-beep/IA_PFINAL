from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select, update

from app.entities import Usuario, Vehiculo, VehiculoImagen
from app.schemas.common import Message
from app.schemas.vehicles import ImageInput, VehicleInput, VehicleOutput, VehicleStateInput
from app.security import Db, require_roles
from app.services.images import store_image
from app.services.vehicles import commit_vehicle, get_vehicle, public_vehicle, save_vehicle, validate_state, vehicle_query

router = APIRouter(prefix='/api/vehiculos', tags=['vehiculos'])
Staff = Annotated[Usuario, Depends(require_roles('vendedor', 'gerente', 'admin'))]


@router.get('', response_model=list[VehicleOutput])
def catalog(db: Db, q: str = Query(default='', max_length=200), marca: str = '', precio_max: float | None = Query(default=None, ge=0)):
    query = vehicle_query()
    if q:
        query = query.where(or_(Vehiculo.marca.contains(q, autoescape=True), Vehiculo.modelo.contains(q, autoescape=True)))
    if marca:
        query = query.where(Vehiculo.marca == marca)
    if precio_max is not None:
        query = query.where(Vehiculo.precio <= precio_max)
    return [public_vehicle(db, vehicle) for vehicle in db.scalars(query.order_by(Vehiculo.created_at.desc()))]


@router.get('/inventario', response_model=list[VehicleOutput])
def inventory(db: Db, staff: Staff):
    return [public_vehicle(db, vehicle) for vehicle in db.scalars(vehicle_query(False).order_by(Vehiculo.id.desc()))]


@router.get('/inventario/{vehicle_id}', response_model=VehicleOutput)
def internal_detail(vehicle_id: int, db: Db, staff: Staff):
    return public_vehicle(db, get_vehicle(db, vehicle_id))


@router.get('/{vehicle_id}', response_model=VehicleOutput)
def detail(vehicle_id: int, db: Db):
    return public_vehicle(db, get_vehicle(db, vehicle_id, public=True))


@router.post('', response_model=VehicleOutput, status_code=201)
def create(payload: VehicleInput, db: Db, staff: Staff):
    return public_vehicle(db, commit_vehicle(db, save_vehicle(db, payload, staff.id)))


@router.put('/{vehicle_id}', response_model=VehicleOutput)
def edit(vehicle_id: int, payload: VehicleInput, db: Db, staff: Staff):
    return public_vehicle(db, commit_vehicle(db, save_vehicle(db, payload, staff.id, vehicle_id)))


@router.patch('/{vehicle_id}/estado', response_model=VehicleOutput)
def change_state(vehicle_id: int, payload: VehicleStateInput, db: Db, staff: Staff):
    vehicle = get_vehicle(db, vehicle_id, lock=True)
    validate_state(db, vehicle, payload.estado)
    vehicle.estado = payload.estado
    vehicle.activo = True
    vehicle.actualizado_por = staff.id
    return public_vehicle(db, commit_vehicle(db, vehicle))


@router.delete('/{vehicle_id}', response_model=Message)
def hide(vehicle_id: int, db: Db, staff: Staff):
    vehicle = get_vehicle(db, vehicle_id, lock=True)
    vehicle.activo = False
    vehicle.estado = 'oculto'
    vehicle.actualizado_por = staff.id
    commit_vehicle(db, vehicle)
    return Message(message='Vehículo ocultado.')


@router.post('/{vehicle_id}/imagenes', response_model=VehicleOutput, status_code=201)
def upload(vehicle_id: int, file: UploadFile, db: Db, staff: Staff):
    vehicle = get_vehicle(db, vehicle_id, lock=True)
    route, path, original = store_image(file, vehicle_id)
    try:
        count = db.scalar(select(func.count()).select_from(VehiculoImagen).where(VehiculoImagen.vehiculo_id == vehicle.id))
        principal = not vehicle.imagen_principal
        db.add(VehiculoImagen(vehiculo_id=vehicle.id, ruta=route, nombre_original=original, alt_text=f'{vehicle.marca} {vehicle.modelo}', orden=count, es_principal=principal))
        if principal:
            vehicle.imagen_principal = route
        vehicle.actualizado_por = staff.id
        commit_vehicle(db, vehicle)
    except Exception:
        path.unlink(missing_ok=True)  # Solo el archivo nuevo generado por esta operación.
        raise
    return public_vehicle(db, vehicle)


@router.patch('/{vehicle_id}/imagenes/{image_id}', response_model=VehicleOutput)
def edit_image(vehicle_id: int, image_id: int, payload: ImageInput, db: Db, staff: Staff):
    vehicle = get_vehicle(db, vehicle_id, lock=True)
    picture = db.scalar(select(VehiculoImagen).where(VehiculoImagen.id == image_id, VehiculoImagen.vehiculo_id == vehicle_id))
    if not picture:
        raise HTTPException(404, 'Imagen no encontrada.')
    if payload.es_principal:
        db.execute(update(VehiculoImagen).where(VehiculoImagen.vehiculo_id == vehicle_id).values(es_principal=False))
        picture.es_principal = True
        vehicle.imagen_principal = picture.ruta
    picture.alt_text, picture.orden = payload.alt_text, payload.orden
    commit_vehicle(db, vehicle)
    return public_vehicle(db, vehicle)
