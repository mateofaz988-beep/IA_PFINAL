import { Modulo } from '../models/modulo.model';
import { EstadoTurno, Turno } from '../models/turno.model';

/**
 * Simulación de "próximo servidor libre": cada turno queda asignado a un
 * único módulo desde que se crea (no se reparte de nuevo después), así que
 * la cola de cada módulo es un FIFO independiente y no hace falta simular
 * los módulos entre sí más que una vez, al momento de elegir dónde entra
 * el turno nuevo.
 */

export interface Rango {
  desde: Date;
  hasta: Date;
}

export interface ResultadoAsignacion {
  modulo: Modulo;
  inicioEstimado: Date;
}

const ANCHO_BASE_MIN = 10;
const ANCHO_POR_TURNO_MIN = 5;
const ANCHO_MAX_MIN = 60;

/** Timestamp de la transición más reciente a `estado` dentro del historial del turno, o null si nunca ocurrió. */
export function transicionMasReciente(turno: Turno, estado: EstadoTurno): Date | null {
  for (let i = turno.transiciones.length - 1; i >= 0; i--) {
    if (turno.transiciones[i].estado === estado) {
      return turno.transiciones[i].en.toDate();
    }
  }
  return null;
}

/**
 * Cuándo queda libre un módulo: ahora mismo si no tiene a nadie en
 * atención, o el fin estimado de la atención en curso (nunca antes de
 * ahora — una atención que se alarga no "libera" el módulo en el pasado)
 * más la duración de todo lo que ya tiene en espera.
 */
export function libreEnDelModulo(
  modulo: Modulo,
  turnosActivosDelArea: Turno[],
  duracionMin: number,
  ahora: Date,
): Date {
  const enAtencion = turnosActivosDelArea.find((t) => t.moduloId === modulo.id && t.estado === 'en_atencion');

  let libre: Date;
  if (enAtencion) {
    const inicio = transicionMasReciente(enAtencion, 'en_atencion') ?? ahora;
    const finEstimado = new Date(inicio.getTime() + duracionMin * 60_000);
    libre = finEstimado.getTime() > ahora.getTime() ? finEstimado : ahora;
  } else {
    libre = ahora;
  }

  const enEspera = turnosActivosDelArea.filter((t) => t.moduloId === modulo.id && t.estado === 'en_espera').length;
  return new Date(libre.getTime() + enEspera * duracionMin * 60_000);
}

/** Elige, entre los módulos activos de un área, el que deja al turno nuevo con la hora de inicio más temprana. */
export function elegirModulo(
  modulos: Modulo[],
  turnosActivosDelArea: Turno[],
  duracionMin: number,
  ahora: Date,
): ResultadoAsignacion {
  let mejor: ResultadoAsignacion | null = null;
  for (const modulo of modulos) {
    const inicioEstimado = libreEnDelModulo(modulo, turnosActivosDelArea, duracionMin, ahora);
    if (!mejor || inicioEstimado.getTime() < mejor.inicioEstimado.getTime()) {
      mejor = { modulo, inicioEstimado };
    }
  }
  if (!mejor) {
    throw new Error('No hay módulos activos para esta área.');
  }
  return mejor;
}

/**
 * Rango honesto alrededor de una hora estimada: el ancho crece con la
 * cantidad de gente por delante, porque cada turno intermedio es una
 * oportunidad más de que la estimación se desvíe.
 */
export function calcularRango(inicioEstimado: Date, posicionEnCola: number, ahora: Date): Rango {
  const anchoMin = Math.min(ANCHO_BASE_MIN + posicionEnCola * ANCHO_POR_TURNO_MIN, ANCHO_MAX_MIN);
  const mitadMs = (anchoMin / 2) * 60_000;
  const desde = new Date(Math.max(ahora.getTime(), inicioEstimado.getTime() - mitadMs));
  const hasta = new Date(Math.max(inicioEstimado.getTime() + mitadMs, desde.getTime()));
  return { desde, hasta };
}

/**
 * Recalcula, en vivo, dónde queda un turno ya asignado dentro de la cola
 * actual de su módulo. turnosDelModulo debe traer los turnos en_espera y
 * en_atencion de ESE módulo (ver TurnosService.colaYAtencionDelModulo).
 */
export function estimacionEnVivo(
  turno: Turno,
  turnosDelModulo: Turno[],
  duracionMin: number,
  ahora: Date,
): Rango {
  const enAtencion = turnosDelModulo.find((t) => t.estado === 'en_atencion');

  let libre: Date;
  if (enAtencion) {
    const inicio = transicionMasReciente(enAtencion, 'en_atencion') ?? ahora;
    const finEstimado = new Date(inicio.getTime() + duracionMin * 60_000);
    libre = finEstimado.getTime() > ahora.getTime() ? finEstimado : ahora;
  } else {
    libre = ahora;
  }

  const creadoEnTurno = turno.creadoEn.toMillis();
  const delante = turnosDelModulo.filter(
    (t) => t.estado === 'en_espera' && t.creadoEn.toMillis() < creadoEnTurno,
  ).length;

  const inicioEstimado = new Date(libre.getTime() + delante * duracionMin * 60_000);
  return calcularRango(inicioEstimado, delante, ahora);
}

/** Posición (1-indexado) de un turno en_espera dentro de la cola de su módulo. */
export function posicionEnCola(turno: Turno, turnosDelModulo: Turno[]): number {
  const creadoEnTurno = turno.creadoEn.toMillis();
  return (
    turnosDelModulo.filter((t) => t.estado === 'en_espera' && t.creadoEn.toMillis() < creadoEnTurno).length + 1
  );
}
