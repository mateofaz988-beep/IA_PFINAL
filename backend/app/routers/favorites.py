from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from app.entities import Favorito, Usuario, Vehiculo
from app.schemas.common import Message
from app.schemas.vehicles import VehicleOutput
from app.security import Db, require_roles
from app.services.vehicles import get_vehicle, public_vehicle, vehicle_query

router = APIRouter(prefix='/api/favoritos', tags=['favoritos'])
Customer = Annotated[Usuario, Depends(require_roles('cliente'))]


@router.get('', response_model=list[VehicleOutput])
def favorites(db: Db, user: Customer):
    query = vehicle_query().join(Favorito, Favorito.vehiculo_id == Vehiculo.id).where(Favorito.usuario_id == user.id)
    return [public_vehicle(db, vehicle) for vehicle in db.scalars(query)]


@router.post('/{vehicle_id}', response_model=Message)
def add_favorite(vehicle_id: int, db: Db, user: Customer):
    db.scalar(select(Usuario.id).where(Usuario.id == user.id).with_for_update())
    get_vehicle(db, vehicle_id, public=True)
    exists = db.scalar(select(Favorito.id).where(Favorito.usuario_id == user.id, Favorito.vehiculo_id == vehicle_id).with_for_update())
    if not exists:
        db.add(Favorito(usuario_id=user.id, vehiculo_id=vehicle_id))
    db.commit()
    return Message(message='Vehículo guardado en favoritos.')


@router.delete('/{vehicle_id}', response_model=Message)
def remove_favorite(vehicle_id: int, db: Db, user: Customer):
    db.execute(delete(Favorito).where(Favorito.usuario_id == user.id, Favorito.vehiculo_id == vehicle_id))
    db.commit()
    return Message(message='Favorito eliminado.')
