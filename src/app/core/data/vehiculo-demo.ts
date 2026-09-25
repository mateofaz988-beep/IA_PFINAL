import { Fecha as Timestamp } from '../models/fecha';
import { Vehiculo, VehiculoInput } from '../models/vehiculo.model';

/**
 * Fichas académicas, nunca inventario comercial verificado. Sin escritura automática.
 * Clases contrastadas con TensorFlow Datasets (no hay labels del modelo en este repo):
 * https://github.com/tensorflow/datasets/blob/master/tensorflow_datasets/image_classification/cars196.py
 * La relación visual es por modelo/generación; el año de referencia no certifica la foto.
 * Se excluyen bmw, Honda Odyssey, rolsroy y tesla por aparentar generaciones posteriores.
 */
type FichaDemo = Pick<VehiculoInput,
  'marca' | 'modelo' | 'anio' | 'categoria' | 'precio' | 'kilometraje' | 'color' |
  'imagenPrincipal' | 'combustible' | 'transmision' | 'puertas' | 'pasajeros'
> & {
  id: string;
  referenciaCars196: string;
  disponibilidad?: VehiculoInput['disponibilidad'];
  destacado?: boolean;
};

const FICHAS: FichaDemo[] = [
  { id: 'demo-volkswagen-beetle', marca: 'Volkswagen', modelo: 'Beetle', anio: 2012,
    categoria: 'hatchback', precio: 14900, kilometraje: 82000, color: 'Rojo',
    imagenPrincipal: '/catalogo/volkswagen-beetle.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 3, pasajeros: 4, destacado: true,
    referenciaCars196: 'Volkswagen Beetle Hatchback 2012' },
  { id: 'demo-toyota-corolla', marca: 'Toyota', modelo: 'Corolla', anio: 2012,
    categoria: 'sedan', precio: 11800, kilometraje: 126000, color: 'Blanco',
    imagenPrincipal: '/catalogo/toyota-corolla.jpg', combustible: 'gasolina',
    transmision: 'manual', puertas: 4, pasajeros: 5,
    referenciaCars196: 'Toyota Corolla Sedan 2012' },
  { id: 'demo-porsche-panamera', marca: 'Porsche', modelo: 'Panamera', anio: 2012,
    categoria: 'sedan', precio: 38900, kilometraje: 74000, color: 'Negro',
    imagenPrincipal: '/imagenes/porche.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 5, pasajeros: 4, destacado: true,
    referenciaCars196: 'Porsche Panamera Sedan 2012' },
  { id: 'demo-dodge-charger', marca: 'Dodge', modelo: 'Charger', anio: 2009,
    categoria: 'sedan', precio: 21900, kilometraje: 97000, color: 'Rojo',
    imagenPrincipal: '/catalogo/dodge-charger-srt8.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 4, pasajeros: 5, disponibilidad: 'reservado',
    referenciaCars196: 'Dodge Charger SRT-8 2009' },
  { id: 'demo-fisker-karma', marca: 'Fisker', modelo: 'Karma', anio: 2012,
    categoria: 'sedan', precio: 32900, kilometraje: 56000, color: 'Plata',
    imagenPrincipal: '/catalogo/fisker-karma.jpg', combustible: 'hibrido',
    transmision: 'automatica', puertas: 4, pasajeros: 4,
    referenciaCars196: 'Fisker Karma Sedan 2012' },
  { id: 'demo-jeep-wrangler', marca: 'Jeep', modelo: 'Wrangler', anio: 2012,
    categoria: 'suv', precio: 24500, kilometraje: 104000, color: 'Blanco',
    imagenPrincipal: '/imagenes/jeep.webp', combustible: 'gasolina',
    transmision: 'manual', puertas: 5, pasajeros: 5,
    referenciaCars196: 'Jeep Wrangler SUV 2012' },
  { id: 'demo-hummer-h3t', marca: 'HUMMER', modelo: 'H3T', anio: 2010,
    categoria: 'pickup', precio: 28500, kilometraje: 112000, color: 'Naranja',
    imagenPrincipal: '/catalogo/hummer-h3t.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 4, pasajeros: 5,
    referenciaCars196: 'HUMMER H3T Crew Cab 2010' },
  { id: 'demo-ferrari-458', marca: 'Ferrari', modelo: '458 Italia', anio: 2012,
    categoria: 'deportivo', precio: 169000, kilometraje: 31000, color: 'Rojo',
    imagenPrincipal: '/catalogo/ferrari-458-italia.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 2, pasajeros: 2, destacado: true,
    referenciaCars196: 'Ferrari 458 Italia Coupe 2012' },
  { id: 'demo-lamborghini-aventador', marca: 'Lamborghini', modelo: 'Aventador', anio: 2012,
    categoria: 'deportivo', precio: 259000, kilometraje: 22000, color: 'Naranja',
    imagenPrincipal: '/catalogo/lamborghini-aventador.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 2, pasajeros: 2, disponibilidad: 'reservado',
    referenciaCars196: 'Lamborghini Aventador Coupe 2012' },
  { id: 'demo-bugatti-veyron', marca: 'Bugatti', modelo: 'Veyron', anio: 2009,
    categoria: 'deportivo', precio: 1250000, kilometraje: 18000, color: 'Blanco',
    imagenPrincipal: '/catalogo/bugatti-veyron.jpg', combustible: 'gasolina',
    transmision: 'automatica', puertas: 2, pasajeros: 2, disponibilidad: 'vendido',
    referenciaCars196: 'Bugatti Veyron 16.4 Coupe 2009' },
];

export function crearVehiculosDemo(): Vehiculo[] {
  return FICHAS.map((ficha, index) => {
    const fecha = Timestamp.fromMillis(Date.UTC(2026, 0, 20 - index));
    return {
      ...ficha,
      version: '',
      motor: '',
      tipo: 'usado',
      moneda: 'USD',
      disponibilidad: ficha.disponibilidad ?? 'disponible',
      stock: ficha.disponibilidad === 'vendido' ? 0 : 1,
      ubicacion: 'Exhibición académica',
      caracteristicas: ['Vehículo usado', 'Fotografía de referencia'],
      equipamiento: [],
      descripcion: `${ficha.marca} ${ficha.modelo}: una selección con carácter propio. ` +
        'Ficha de demostración académica. Año de referencia Cars196; precio, kilometraje, ' +
        'transmisión y estado son ilustrativos. Versión y equipamiento por confirmar.',
      imagenes: [{ url: ficha.imagenPrincipal, orden: 1, tipo: 'exterior' }],
      destacado: ficha.destacado ?? false,
      oferta: false,
      tags: ['demo-academica'],
      esDemo: true,
      creadoPor: 'demo-local',
      creadoEn: fecha,
      actualizadoEn: fecha,
      publicadoEn: fecha,
    };
  });
}
