import { environment } from '../../../environments/environment';
import { Fecha } from './fecha';
import { Vehiculo, VehiculoInput } from './vehiculo.model';

export interface VehicleApi {
  id: number; codigo: string; marca: string; modelo: string; version: string | null; anio: number;
  precio: string | number; kilometraje: number; vin: string | null; combustible: string | null;
  transmision: string | null; color: string | null; motor: string | null; categoria: string | null;
  descripcion: string | null; estado: Vehiculo['disponibilidad']; destacado: boolean; activo: boolean;
  cars196_clase_id: number | null; caracteristicas: string[]; imagen_principal: string | null;
  imagenes: {id: number; ruta: string; nombre_original: string | null; alt_text: string | null; orden: number; es_principal: boolean}[];
  datos_demo: boolean; referencia_cars196: string | null; created_at: string; updated_at: string;
}
export function imageUrl(path: string | null): string {
  if (!path) return '';
  return path.startsWith('/media/') ? new URL(environment.apiUrl).origin + path : path;
}
export function fromApi(v: VehicleApi): Vehiculo {
  const count = (prefix: string) => Number(v.caracteristicas.find(value => value.startsWith(prefix))?.split(':')[1] ?? 0);
  return { id: String(v.id), codigo: v.codigo, vin: v.vin ?? '', marca: v.marca, modelo: v.modelo, version: v.version ?? '', anio: v.anio,
    categoria: (v.categoria ?? '') as Vehiculo['categoria'], tipo: 'usado', kilometraje: v.kilometraje, color: v.color ?? '',
    combustible: (v.combustible ?? '') as Vehiculo['combustible'], transmision: (v.transmision ?? '') as Vehiculo['transmision'], motor: v.motor ?? '',
    pasajeros: count('Plazas:'), puertas: count('Puertas:'), precio: Number(v.precio), moneda: 'USD', disponibilidad: v.estado,
    stock: v.estado === 'vendido' ? 0 : 1, ubicacion: v.datos_demo ? 'Exhibición académica' : 'AutoScan Motors',
    caracteristicas: v.caracteristicas, equipamiento: [], descripcion: v.descripcion ?? '', imagenPrincipal: imageUrl(v.imagen_principal),
    imagenes: v.imagenes.map(i => ({url: imageUrl(i.ruta), orden: i.orden, tipo: 'exterior', descripcion: i.alt_text ?? ''})),
    destacado: v.destacado, oferta: false, tags: [], creadoPor: '', creadoEn: Fecha.fromIso(v.created_at), actualizadoEn: Fecha.fromIso(v.updated_at),
    esDemo: v.datos_demo, referenciaCars196: v.referencia_cars196 ?? undefined };
}
export function toApi(input: Partial<VehiculoInput>): Record<string, unknown> {
  return { marca: input.marca, modelo: input.modelo, version: input.version, anio: input.anio, precio: input.precio, kilometraje: input.kilometraje,
    vin: input.vin || null, combustible: input.combustible, transmision: input.transmision, color: input.color, motor: input.motor,
    categoria: input.categoria, descripcion: input.descripcion, estado: input.disponibilidad, destacado: input.destacado, caracteristicas: input.caracteristicas ?? [] };
}
