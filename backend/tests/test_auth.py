from uuid import uuid4

import pytest
from sqlalchemy import select

from app.entities import Usuario
from app.schemas.auth import RegisterInput
from app.security import token_for
from app.services.users import create_user


def registration():
    return {'nombre': 'Prueba', 'apellido': 'Rollback', 'email': f'{uuid4().hex}@example.com', 'password': 'Test-only-Password-927!'}


def authorize(user):
    return {'Authorization': f'Bearer {token_for(user)}'}


def test_registration_hash_login_and_no_role_escalation(api, mysql_session):
    payload = registration()
    malicious = api.post('/api/auth/register', json={**payload, 'role_id': 4})
    assert malicious.status_code == 422
    assert payload['password'] not in malicious.text
    response = api.post('/api/auth/register', json=payload)
    assert response.status_code == 201, response.text
    assert response.json()['user']['rol'] == 'cliente'
    assert 'password_hash' not in response.text
    user = mysql_session.scalar(select(Usuario).where(Usuario.email == payload['email']))
    assert user.password_hash.startswith('$argon2id$')
    assert api.post('/api/auth/login', json={'email': payload['email'], 'password': 'wrong-password'}).status_code == 401
    assert api.post('/api/auth/login', json={'email': payload['email'], 'password': payload['password']}).status_code == 200
    assert api.post('/api/auth/register', json=payload).status_code == 409


def test_refresh_rotation_logout_and_invalid_jwt(api):
    response = api.post('/api/auth/register', json=registration())
    access = response.json()['access_token']
    refresh = api.cookies.get('autoscan_refresh')
    headers = {'Authorization': f'Bearer {access}'}
    assert api.get('/api/auth/me', headers=headers).status_code == 200
    assert api.get('/api/auth/me', headers={'Authorization': 'Bearer invalid'}).status_code == 401
    rotated = api.post('/api/auth/refresh')
    assert rotated.status_code == 200
    assert api.get('/api/auth/me', headers=headers).status_code == 401
    assert api.post('/api/auth/refresh', headers={'Cookie': f'autoscan_refresh={refresh}'}).status_code == 401
    new_headers = {'Authorization': f"Bearer {rotated.json()['access_token']}"}
    assert api.post('/api/auth/logout', headers=new_headers).status_code == 200
    assert api.get('/api/auth/me', headers=new_headers).status_code == 401


@pytest.mark.parametrize('role_id', [1, 2, 3])
def test_only_admin_creates_employees(api, mysql_session, role_id):
    user = create_user(mysql_session, RegisterInput(**registration()), role_id=role_id)
    for role in ('vendedor', 'gerente'):
        assert api.post('/api/usuarios/empleados', json={**registration(), 'rol': role}, headers=authorize(user)).status_code == 403


@pytest.mark.parametrize('role', ['vendedor', 'gerente'])
def test_admin_creates_employee_and_forces_password_change(api, mysql_session, role):
    admin = create_user(mysql_session, RegisterInput(**registration()), role_id=4)
    data = {**registration(), 'rol': role}
    response = api.post('/api/usuarios/empleados', json=data, headers=authorize(admin))
    assert response.status_code == 201, response.text
    assert response.json()['debe_cambiar_password']
    employee = mysql_session.get(Usuario, response.json()['id'])
    old_headers = authorize(employee)
    changed = api.post('/api/auth/change-password', json={'current_password': data['password'], 'new_password': 'Replacement-Test-Only-123!'}, headers=old_headers)
    assert changed.status_code == 200
    assert not changed.json()['user']['debe_cambiar_password']
    assert api.get('/api/auth/me', headers=old_headers).status_code == 401
    assert api.patch(f'/api/usuarios/{employee.id}', json={'activo': False}, headers=authorize(admin)).status_code == 200
    assert api.get('/api/auth/me', headers={'Authorization': f"Bearer {changed.json()['access_token']}"}).status_code == 401


def test_csrf_and_profile_mass_assignment(api):
    response = api.post('/api/auth/register', json=registration())
    headers = {'Authorization': f"Bearer {response.json()['access_token']}"}
    assert api.post('/api/auth/refresh', headers={'Origin': 'https://foreign.example'}).status_code == 403
    assert api.put('/api/auth/me', headers=headers, json={'nombre': 'Cliente', 'role_id': 4}).status_code == 422
