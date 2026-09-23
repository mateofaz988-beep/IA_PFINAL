import { Timestamp } from 'firebase/firestore';

export type CategoriaVehiculo = 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'coupe' | 'minivan' | 'van' | 'deportivo';
export type TipoVehiculo = 'nuevo' | 'usado' | 'seminuevo';
export type Combustible = 'gasolina' | 'diesel' | 'electrico' | 'hibrido' | 'gas';
export type Transmision = 'manual' | 'automatica' | 'cvt' | 'dsg';
export type Traccion = '4x2' | '4x4' | 'awd';
export type DisponibilidadVehiculo =
  | 'disponible'
  | 'reservado'
  | 'vendido'
  | 'en_preparacion'
  | 'mantenimiento'
  | 'no_disponible';

export interface ImagenVehiculo {
  url: string;
  orden: number;
  tipo: 'exterior' | 'interior' | 'motor' | 'detalle';
  descripcion?: string;
}

export interface Vehiculo {
  id: string;

  // Identificación
  vin?: string;
  placa?: string;

  // Básicos
  marca: string;
  modelo: string;
  version: string;
  anio: number;

  // Clasificación
  categoria: CategoriaVehiculo;
  tipo: TipoVehiculo;

  // Técnicos
  kilometraje: number;
  color: string;
  colorInterior?: string;
  combustible: Combustible;
  transmision: Transmision;
  traccion?: Traccion;
  motor: string;
  cilindros?: number;
  caballosFuerza?: number;

  // Capacidad
  pasajeros: number;
  puertas: number;

  // Comercial
  precio: number;
  precioAnterior?: number;
  moneda: 'USD' | 'EUR';
  disponibilidad: DisponibilidadVehiculo;
  stock: number;
  ubicacion: string;

  // Características y equipamiento
  caracteristicas: string[];
  equipamiento: string[];

  // Contenido
  descripcion: string;
  imagenes: ImagenVehiculo[];
  imagenPrincipal: string;

  // Marketing
  destacado: boolean;
  oferta: boolean;
  tags: string[];

  // Metadata
  creadoPor: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  publicadoEn?: Timestamp;
}

export type VehiculoDoc = Omit<Vehiculo, 'id'>;

export interface VehiculoInput {
  vin?: string;
  placa?: string;
  marca: string;
  modelo: string;
  version: string;
  anio: number;
  categoria: CategoriaVehiculo;
  tipo: TipoVehiculo;
  kilometraje: number;
  color: string;
  colorInterior?: string;
  combustible: Combustible;
  transmision: Transmision;
  traccion?: Traccion;
  motor: string;
  cilindros?: number;
  caballosFuerza?: number;
  pasajeros: number;
  puertas: number;
  precio: number;
  precioAnterior?: number;
  moneda: 'USD' | 'EUR';
  disponibilidad: DisponibilidadVehiculo;
  stock: number;
  ubicacion: string;
  caracteristicas: string[];
  equipamiento: string[];
  descripcion: string;
  imagenes: ImagenVehiculo[];
  imagenPrincipal: string;
  destacado: boolean;
  oferta: boolean;
  tags: string[];
}

export interface FiltrosVehiculo {
  marca?: string;
  modelo?: string;
  anioMin?: number;
  anioMax?: number;
  precioMin?: number;
  precioMax?: number;
  categoria?: CategoriaVehiculo;
  tipo?: TipoVehiculo;
  combustible?: Combustible;
  transmision?: Transmision;
  disponibilidad?: DisponibilidadVehiculo;
  destacado?: boolean;
  oferta?: boolean;
  busqueda?: string; // búsqueda de texto libre
}
