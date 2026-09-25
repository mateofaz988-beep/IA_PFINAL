import { Vehiculo } from '../models/vehiculo.model';

export interface FiltrosCatalogo {
  busqueda: string;
  marca: string;
  categoria: string;
  combustible: string;
  transmision: string;
  anio: string;
  disponibilidad: string;
  precioMax: number | null;
}

export type OrdenCatalogo = 'recientes' | 'precio_asc' | 'precio_desc' | 'kilometraje_asc' | 'anio_desc' | 'anio_asc';

export const FILTROS_INICIALES: FiltrosCatalogo = {
  busqueda: '', marca: '', categoria: '', combustible: '', transmision: '',
  anio: '', disponibilidad: '', precioMax: null,
};

const ETIQUETAS: Record<string, string> = {
  sedan: 'Sedán', suv: 'SUV', pickup: 'Pickup', hatchback: 'Hatchback', coupe: 'Coupé',
  minivan: 'Minivan', van: 'Van', deportivo: 'Deportivo', gasolina: 'Gasolina', diesel: 'Diésel',
  electrico: 'Eléctrico', hibrido: 'Híbrido', gas: 'Gas', manual: 'Manual', automatica: 'Automática',
  cvt: 'CVT', dsg: 'DSG', disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido',
};
export const etiquetaCatalogo = (valor: string): string => ETIQUETAS[valor] ?? valor;
const normalizar = (valor: string): string => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function fechaPublicacion(vehiculo: Vehiculo): number {
  const fecha = vehiculo.publicadoEn ?? vehiculo.creadoEn;
  return typeof fecha?.toMillis === 'function' ? fecha.toMillis() : 0;
}

export function filtrarYOrdenarCatalogo(vehiculos: Vehiculo[], filtros: FiltrosCatalogo, orden: OrdenCatalogo): Vehiculo[] {
  const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean);
  const resultado = vehiculos.filter((v) => {
    const texto = normalizar(`${v.marca} ${v.modelo} ${v.version ?? ''}`);
    return palabras.every((palabra) => texto.includes(palabra))
      && (!filtros.marca || v.marca === filtros.marca)
      && (!filtros.categoria || v.categoria === filtros.categoria)
      && (!filtros.combustible || v.combustible === filtros.combustible)
      && (!filtros.transmision || v.transmision === filtros.transmision)
      && (!filtros.anio || v.anio === Number(filtros.anio))
      && (!filtros.disponibilidad || v.disponibilidad === filtros.disponibilidad)
      && (filtros.precioMax === null || v.precio <= filtros.precioMax);
  });
  return resultado.sort((a, b) => {
    switch (orden) {
      case 'precio_asc': return a.precio - b.precio;
      case 'precio_desc': return b.precio - a.precio;
      case 'kilometraje_asc': return a.kilometraje - b.kilometraje;
      case 'anio_desc': return b.anio - a.anio;
      case 'anio_asc': return a.anio - b.anio;
      case 'recientes': return fechaPublicacion(b) - fechaPublicacion(a);
    }
  });
}
