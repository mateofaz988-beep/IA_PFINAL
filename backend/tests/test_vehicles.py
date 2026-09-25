from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from app.config import settings
from app.entities import Vehiculo
from app.schemas.auth import RegisterInput
from app.services.users import create_user
from test_auth import authorize, registration

VEHICLE = {'marca': 'Chevrolet', 'modelo': 'Aveo', 'anio': 2011, 'precio': '8900.00', 'kilometraje': 126000,
           'combustible': 'gasolina', 'transmision': 'manual', 'color': 'Plata', 'motor': '1.6', 'caracteristicas': ['ABS', 'Bluetooth']}


@pytest.mark.parametrize('role_id', [2, 3, 4])
def test_staff_crud_without_cars196_and_soft_delete(api, mysql_session, role_id):
    user = create_user(mysql_session, RegisterInput(**registration()), role_id=role_id)
    headers = authorize(user)
    response = api.post('/api/vehiculos', json=VEHICLE, headers=headers)
    assert response.status_code == 201, response.text
    vehicle = response.json()
    assert vehicle['codigo'].startswith('AUTO-') and vehicle['cars196_clase_id'] is None
    assert set(vehicle['caracteristicas']) == {'ABS', 'Bluetooth'}
    url = f"/api/vehiculos/{vehicle['id']}"
    assert api.get(url).status_code == 200
    assert api.put(url, json={**VEHICLE, 'precio': '8500.00'}, headers=headers).json()['precio'] == '8500.00'
    assert api.patch(url + '/estado', json={'estado': 'oculto'}, headers=headers).status_code == 200
    assert api.get(url).status_code == 404
    assert api.delete(url, headers=headers).status_code == 200
    mysql_session.expire_all()
    assert mysql_session.get(Vehiculo, vehicle['id']).activo == 0


def test_customer_cannot_write_and_year_validation(api, mysql_session):
    user = create_user(mysql_session, RegisterInput(**registration()))
    assert api.post('/api/vehiculos', json=VEHICLE, headers=authorize(user)).status_code == 403
    assert api.post('/api/vehiculos', json=VEHICLE).status_code == 401
    staff = create_user(mysql_session, RegisterInput(**registration()), role_id=2)
    assert api.post('/api/vehiculos', json={**VEHICLE, 'anio': 2020}, headers=authorize(staff)).status_code == 422


def test_upload_validates_content_and_generates_safe_path(api, mysql_session, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, 'storage_dir', tmp_path)
    staff = create_user(mysql_session, RegisterInput(**registration()), role_id=2)
    headers = authorize(staff)
    vehicle = api.post('/api/vehiculos', json=VEHICLE, headers=headers).json()
    url = f"/api/vehiculos/{vehicle['id']}/imagenes"
    assert api.post(url, files={'file': ('malware.jpg', b'not-an-image', 'image/jpeg')}, headers=headers).status_code == 422
    buffer = BytesIO()
    Image.new('RGB', (16, 16)).save(buffer, format='PNG')
    assert api.post(url, files={'file': ('fake.jpg', buffer.getvalue(), 'image/jpeg')}, headers=headers).status_code == 422
    response = api.post(url, files={'file': ('../../photo.png', buffer.getvalue(), 'image/png')}, headers=headers)
    assert response.status_code == 201, response.text
    picture = response.json()['imagenes'][0]
    assert picture['nombre_original'] == 'photo.png'
    assert '..' not in picture['ruta']
    assert (tmp_path / 'vehiculos' / str(vehicle['id']) / Path(picture['ruta']).name).is_file()
    assert response.json()['imagen_principal'] == picture['ruta']
