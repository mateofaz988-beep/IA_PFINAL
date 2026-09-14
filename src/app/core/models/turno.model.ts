import { Timestamp } from 'firebase/firestore';

/**
 * pendiente ──► en_espera ──► en_atencion ──► atendido
 *     │              │              │
 *     └──► cancelado ┴──► cancelado ┘
 *
 * Ninguna transición retrocede; atendido/cancelado son terminales.
 * Ver TurnosService (fase 2) para la validación de las transiciones.
 */
export type EstadoTurno = 'pendiente' | 'en_espera' | 'en_atencion' | 'atendido' | 'cancelado';

export interface TransicionEstado {
  estado: EstadoTurno;
  en: Timestamp;
}

export interface RangoHora {
  desde: Timestamp;
  hasta: Timestamp;
}

/** Resultado del clasificador (vía el asistente, en modo silencioso) para un turno de avalúo. */
export interface DatosVehiculo {
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  /** Confianza del top-1 del clasificador, 0..1. Null si quedó fuera de catálogo. */
  confianza: number | null;
  fueraDeCatalogo: boolean;
  /** Año estimado por el prefiltro visual, incluso cuando el vehículo queda fuera de catálogo. */
  anioEstimado: number | null;
  confianzaAnio: 'alta' | 'media' | 'baja' | null;
  /** Motivo que dio el prefiltro cuando el vehículo queda fuera de catálogo. */
  razon: string | null;
  /** true si un asesor confirmó los datos a mano tras un caso fuera de catálogo. */
  verificadoManualmente: boolean;
}

export interface Turno {
  id: string;
  /** Código visible, ej. 'AV-042'. Correlativo por área, reinicia cada día. */
  codigo: string;
  clienteUid: string;
  clienteNombre: string;
  areaId: string;
  moduloId: string | null;
  asesorUid: string | null;
  estado: EstadoTurno;
  /** Solo se llena en áreas con requiereFoto (avalúo); null en el resto. */
  vehiculo: DatosVehiculo | null;
  /**
   * Rango de hora prometido al cliente al crear el turno — se escribe una
   * sola vez y no se reescribe. La estimación que se ve *en vivo* en pantalla
   * es un valor derivado (computed) de la cola actual, no un campo de Firestore;
   * este campo es la promesa original, y sirve para medir estimado vs. real.
   */
  estimacion: RangoHora;
  transiciones: TransicionEstado[];
  creadoEn: Timestamp;
}

export type TurnoDoc = Omit<Turno, 'id'>;
