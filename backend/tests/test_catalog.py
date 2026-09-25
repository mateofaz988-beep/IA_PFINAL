from app.scripts.seed_vehicles import seed


def test_real_catalog_and_seed_are_consistent(api, mysql_session):
    before = api.get('/api/vehiculos')
    assert before.status_code == 200
    assert seed(mysql_session) == 0  # El inventario existente no se sustituye.
    data = api.get('/api/vehiculos').json()
    assert data == before.json()
    assert len([vehicle for vehicle in data if vehicle['datos_demo']]) == 10
    assert all(vehicle['anio'] <= 2012 for vehicle in data)
    assert len({vehicle['imagen_principal'] for vehicle in data}) == len(data)
