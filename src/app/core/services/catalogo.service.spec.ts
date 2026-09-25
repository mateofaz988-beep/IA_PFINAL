import { TestBed } from '@angular/core/testing';
import { crearVehiculosDemo } from '../data/vehiculo-demo';
import { CatalogoService, esVisibleEnCatalogo } from './catalogo.service';
import { VehiculosService } from './vehiculos.service';

describe('Fuente pública del catálogo MySQL', () => {
  const inventario = { listarPublicosAsync: vi.fn(), obtenerPublicoPorId: vi.fn() };
  beforeEach(() => { vi.resetAllMocks(); TestBed.configureTestingModule({ providers: [{ provide: VehiculosService, useValue: inventario }] }); });
  afterEach(() => vi.useRealTimers());
  it('conserva las fichas devueltas por la API sin mezclar fuentes', async () => {
    const ficha = { ...crearVehiculosDemo()[0], id: '1', esDemo: false };
    inventario.listarPublicosAsync.mockResolvedValue([ficha]);
    expect(await TestBed.inject(CatalogoService).listar()).toEqual({vehiculos: [ficha], origen: 'mysql'});
  });
  it('mantiene el estado vacío cuando MySQL no devuelve inventario', async () => {
    inventario.listarPublicosAsync.mockResolvedValue([]);
    expect(await TestBed.inject(CatalogoService).listar()).toEqual({vehiculos: [], origen: 'mysql'});
  });
  it.each(['servicio no disponible', 'permisos'])('propaga %s sin sustituir inventario por datos locales', async error => {
    inventario.listarPublicosAsync.mockRejectedValue(new Error(error));
    await expect(TestBed.inject(CatalogoService).listar()).rejects.toThrow(error);
  });
  it('termina el loading con error si la red no responde', async () => {
    vi.useFakeTimers(); inventario.listarPublicosAsync.mockReturnValue(new Promise(() => {}));
    const expected = expect(TestBed.inject(CatalogoService).listar()).rejects.toThrow('Tiempo de espera');
    await vi.advanceTimersByTimeAsync(8000); await expected;
  });
  it('identifica las fichas académicas almacenadas en MySQL', async () => {
    inventario.listarPublicosAsync.mockResolvedValue(crearVehiculosDemo());
    const result = await TestBed.inject(CatalogoService).listar(); expect(result.origen).toBe('mysql'); expect(result.vehiculos.every(v => v.esDemo)).toBe(true);
  });
  it('resuelve el detalle por su ID MySQL', async () => {
    inventario.obtenerPublicoPorId.mockResolvedValue({...crearVehiculosDemo()[0], id: '1'});
    expect((await TestBed.inject(CatalogoService).obtenerPorId('1'))?.marca).toBe('Volkswagen');
    expect(inventario.obtenerPublicoPorId).toHaveBeenCalledWith('1');
  });
  it('rechaza IDs locales antiguos e inexistentes', async () => {
    const service = TestBed.inject(CatalogoService);
    expect(await service.obtenerPorId('demo-no-existe')).toBeNull(); expect(inventario.obtenerPublicoPorId).not.toHaveBeenCalled();
    inventario.obtenerPublicoPorId.mockResolvedValue(null); expect(await service.obtenerPorId('999999')).toBeNull();
  });
  it('no expone mantenimiento, ocultos ni años posteriores a 2012', async () => {
    const ficha = crearVehiculosDemo()[0];
    for (const disponibilidad of ['mantenimiento', 'oculto', 'no_disponible', 'en_preparacion'] as const) expect(esVisibleEnCatalogo({...ficha, disponibilidad})).toBe(false);
    expect(esVisibleEnCatalogo({...ficha, anio: 2024})).toBe(false);
    inventario.obtenerPublicoPorId.mockResolvedValue({...ficha, disponibilidad: 'oculto'});
    expect(await TestBed.inject(CatalogoService).obtenerPorId('1')).toBeNull();
  });
});
