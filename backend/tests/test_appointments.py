from datetime import timedelta
from app.schemas.auth import RegisterInput
from app.services.users import create_user
from app.services.appointments import local_now
from test_auth import authorize, registration


def test_appointments_conflicts_seller_assignment_privacy_and_cancellation(api, mysql_session):
    customer = create_user(mysql_session, RegisterInput(**registration()))
    other = create_user(mysql_session, RegisterInput(**registration()))
    manager = create_user(mysql_session, RegisterInput(**registration()), role_id=3)
    seller = create_user(mysql_session, RegisterInput(**registration()), role_id=2)
    cars = [v for v in api.get('/api/vehiculos').json() if v['estado'] == 'disponible']
    start = (local_now() + timedelta(days=3)).replace(hour=10, minute=0, second=0, microsecond=0)
    payload = {'vehiculo_id': cars[0]['id'], 'fecha_inicio': start.isoformat()}
    first = api.post('/api/turnos', json=payload, headers=authorize(customer))
    assert first.status_code == 201, first.text
    assert api.post('/api/turnos', json=payload, headers=authorize(other)).status_code == 409
    assert api.post('/api/turnos', json={**payload, 'fecha_inicio': start.replace(hour=20).isoformat()}, headers=authorize(other)).status_code == 422
    assert api.post('/api/turnos', json={**payload, 'fecha_inicio': (start - timedelta(days=4)).isoformat()}, headers=authorize(other)).status_code == 422
    second = api.post('/api/turnos', json={**payload, 'vehiculo_id': cars[1]['id']}, headers=authorize(other)).json()
    url = f"/api/turnos/{first.json()['id']}"
    assign = {'vendedor_id': seller.id, 'estado': 'confirmado', 'notas_internas': 'Información interna de prueba'}
    assert api.patch(url, json=assign, headers=authorize(manager)).status_code == 200
    assert api.patch(f"/api/turnos/{second['id']}", json=assign, headers=authorize(manager)).status_code == 409
    customer_list = api.get('/api/turnos', headers=authorize(customer))
    assert len(customer_list.json()) == 1
    assert 'Información interna' not in customer_list.text
    assert len(api.get('/api/turnos', headers=authorize(seller)).json()) == 1
    assert api.patch(url, json={'estado': 'cancelado'}, headers=authorize(other)).status_code == 404
    assert api.patch(url, json={'estado': 'cancelado'}, headers=authorize(customer)).status_code == 200
    assert api.patch(f"/api/turnos/{second['id']}", json=assign, headers=authorize(manager)).status_code == 200


def test_back_to_back_appointments_and_sold_vehicle(api, mysql_session):
    customer = create_user(mysql_session, RegisterInput(**registration()))
    vehicles = api.get('/api/vehiculos').json()
    car = next(v for v in vehicles if v['estado'] == 'disponible')
    sold = next(v for v in vehicles if v['estado'] == 'vendido')
    start = (local_now() + timedelta(days=5)).replace(hour=9, minute=0, second=0, microsecond=0)
    for hour in (9, 10):
        response = api.post('/api/turnos', json={'vehiculo_id': car['id'], 'fecha_inicio': start.replace(hour=hour).isoformat()}, headers=authorize(customer))
        assert response.status_code == 201
    assert api.post('/api/turnos', json={'vehiculo_id': sold['id'], 'fecha_inicio': start.isoformat()}, headers=authorize(customer)).status_code == 409
