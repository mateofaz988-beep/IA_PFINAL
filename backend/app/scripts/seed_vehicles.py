"""Cargar las fichas académicas existentes solo cuando el inventario está vacío."""
import json
from pathlib import Path

from sqlalchemy import select
from app.database import SessionLocal, get_engine
from app.entities import Cars196Clase, Configuracion, Vehiculo, VehiculoImagen
from app.schemas.vehicles import VehicleInput
from app.services.vehicles import save_vehicle


def seed(db) -> int:
    # Fila existente compartida: serializa dos ejecuciones del seed sin crear tablas.
    db.scalar(select(Configuracion).where(Configuracion.clave == 'duracion_turno_minutos').with_for_update())
    if db.scalar(select(Vehiculo.id).limit(1)):
        return 0
    records = json.loads((Path(__file__).resolve().parent.parent / 'data' / 'vehiculos_demo.json').read_text(encoding='utf-8'))
    for item in records:
        label = db.scalar(select(Cars196Clase).where(Cars196Clase.label == item['referenciaCars196']))
        if label is None:
            label = Cars196Clase(label=item['referenciaCars196'], marca=item['marca'], modelo=item['modelo'], anio=item['anio'])
            db.add(label)
            db.flush()
        payload = VehicleInput(**{key: item[key] for key in ('marca', 'modelo', 'anio', 'precio', 'kilometraje', 'color', 'categoria', 'combustible', 'transmision')},
            estado=item.get('disponibilidad', 'disponible'), destacado=item.get('destacado', False), cars196_clase_id=label.id,
            descripcion=f"{item['marca']} {item['modelo']}: una selección con carácter propio. Ficha de demostración académica. Año de referencia Cars196; precio, kilometraje, transmisión y estado son ilustrativos. Versión y equipamiento por confirmar.",
            caracteristicas=['Vehículo usado', 'Fotografía de referencia', f"Puertas: {item['puertas']}", f"Plazas: {item['pasajeros']}"])
        vehicle = save_vehicle(db, payload, user_id=None, demo=True)
        vehicle.imagen_principal = item['imagenPrincipal']
        db.add(VehiculoImagen(vehiculo_id=vehicle.id, ruta=item['imagenPrincipal'], alt_text=f"{item['marca']} {item['modelo']}", orden=0, es_principal=True))
    db.commit()
    return len(records)


if __name__ == '__main__':
    with SessionLocal(bind=get_engine()) as db:
        print(json.dumps({'demo_vehicles_created': seed(db)}))
