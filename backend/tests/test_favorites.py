from sqlalchemy import func, select
from app.entities import Favorito
from app.schemas.auth import RegisterInput
from app.services.users import create_user
from test_auth import authorize, registration


def test_favorites_are_private_and_idempotent(api, mysql_session):
    first = create_user(mysql_session, RegisterInput(**registration()))
    second = create_user(mysql_session, RegisterInput(**registration()))
    vehicle = api.get('/api/vehiculos').json()[0]['id']
    url = f'/api/favoritos/{vehicle}'
    assert api.post(url).status_code == 401
    assert api.post(url, headers=authorize(first)).status_code == 200
    assert api.post(url, headers=authorize(first)).status_code == 200
    assert mysql_session.scalar(select(func.count()).select_from(Favorito).where(Favorito.usuario_id == first.id)) == 1
    assert len(api.get('/api/favoritos', headers=authorize(first)).json()) == 1
    assert api.get('/api/favoritos', headers=authorize(second)).json() == []
    assert api.delete(url, headers=authorize(second)).status_code == 200
    assert len(api.get('/api/favoritos', headers=authorize(first)).json()) == 1
    assert api.delete(url, headers=authorize(first)).status_code == 200
    assert api.get('/api/favoritos', headers=authorize(first)).json() == []
