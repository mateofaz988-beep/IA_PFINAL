import { crearVehiculosDemo } from '../data/vehiculo-demo';
import { FILTROS_INICIALES, filtrarYOrdenarCatalogo } from './catalogo.util';

describe('Búsqueda y filtros del catálogo', () => {
  const vehiculos = crearVehiculosDemo();

  it('combina búsqueda sin tildes con marca, categoría, combustible, transmisión, año, precio y estado', () => {
    const resultado = filtrarYOrdenarCatalogo(vehiculos, {
      busqueda: 'TOYÓTA corolla', marca: 'Toyota', categoria: 'sedan', combustible: 'gasolina',
      transmision: 'manual', anio: '2012', precioMax: 11800, disponibilidad: 'disponible',
    }, 'recientes');
    expect(resultado.map((v) => v.id)).toEqual(['demo-toyota-corolla']);
  });

  it('busca versiones y trata precio cero como un límite real', () => {
    const fichas = [{ ...vehiculos[0], version: 'Edición especial' }];
    expect(filtrarYOrdenarCatalogo(fichas, { ...FILTROS_INICIALES, busqueda: 'edicion' }, 'recientes')).toHaveLength(1);
    expect(filtrarYOrdenarCatalogo(fichas, { ...FILTROS_INICIALES, precioMax: 0 }, 'recientes')).toHaveLength(0);
  });

  it('ofrece los seis órdenes sin modificar los datos originales', () => {
    const original = vehiculos.map((v) => v.id);
    expect(filtrarYOrdenarCatalogo(vehiculos, FILTROS_INICIALES, 'precio_asc')[0].marca).toBe('Toyota');
    expect(filtrarYOrdenarCatalogo(vehiculos, FILTROS_INICIALES, 'precio_desc')[0].marca).toBe('Bugatti');
    expect(filtrarYOrdenarCatalogo(vehiculos, FILTROS_INICIALES, 'kilometraje_asc')[0].marca).toBe('Bugatti');
    expect(filtrarYOrdenarCatalogo(vehiculos, FILTROS_INICIALES, 'anio_desc')[0].anio).toBe(2012);
    expect(filtrarYOrdenarCatalogo(vehiculos, FILTROS_INICIALES, 'anio_asc')[0].anio).toBe(2009);
    expect(filtrarYOrdenarCatalogo([...vehiculos].reverse(), FILTROS_INICIALES, 'recientes')[0].marca).toBe('Volkswagen');
    expect(vehiculos.map((v) => v.id)).toEqual(original);
  });

  it('mantiene fichas Cars196 hasta 2012, marcadas demo y sin imágenes duplicadas ni logos', () => {
    expect(vehiculos.every((v) => v.anio <= 2012 && v.esDemo && v.referenciaCars196?.endsWith(String(v.anio)))).toBe(true);
    expect(new Set(vehiculos.map((v) => v.id)).size).toBe(vehiculos.length);
    expect(new Set(vehiculos.map((v) => v.imagenPrincipal)).size).toBe(vehiculos.length);
    expect(vehiculos.some((v) => v.imagenPrincipal.split('/').at(-1)?.includes('logo'))).toBe(false);
  });
});
