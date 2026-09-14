import { Turno } from '../models/turno.model';
import { transicionMasReciente } from './estimacion.util';

export interface ConteoPorClave {
  clave: string;
  total: number;
}

export interface ConteoPorDia {
  fecha: string;
  etiqueta: string;
  total: number;
}

export interface ConteoPorHora {
  hora: number;
  total: number;
}

export interface Estadisticas {
  total: number;
  atendidos: number;
  cancelados: number;
  /** null cuando no hay ningún turno todavía — un 0% ahí sería un dato inventado, no "nadie cancela". */
  tasaCancelacionPct: number | null;
  /** La comparación más valiosa: cuánto dijimos que iba a esperar vs. cuánto esperó de verdad. */
  esperaPromedioRealMin: number | null;
  esperaPromedioRealN: number;
  esperaPromedioEstimadaMin: number | null;
  esperaPromedioEstimadaN: number;
  atencionPromedioMin: number | null;
  atencionPromedioN: number;
  porArea: ConteoPorClave[];
  porAsesor: ConteoPorClave[];
  porDia: ConteoPorDia[];
  porHora: ConteoPorHora[];
}

/** Por debajo de esto, un promedio existe pero no dice mucho todavía — la UI lo marca como preliminar. */
export const MUESTRA_MINIMA_CONFIABLE = 5;

function minutosEntre(desde: Date, hasta: Date): number {
  return (hasta.getTime() - desde.getTime()) / 60_000;
}

function promedio(valores: number[]): number | null {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

function fechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function contarPor(turnos: Turno[], clave: (t: Turno) => string | null): ConteoPorClave[] {
  const mapa = new Map<string, number>();
  for (const t of turnos) {
    const k = clave(t);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].map(([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total);
}

/** Calcula las métricas del punto 7 del encargo sobre un lote de turnos ya cargado — nada de esto toca Firestore. */
export function calcularEstadisticas(turnos: Turno[]): Estadisticas {
  const atendidos = turnos.filter((t) => t.estado === 'atendido');
  const cancelados = turnos.filter((t) => t.estado === 'cancelado');

  const esperasReales: number[] = [];
  const esperasEstimadas: number[] = [];
  const atenciones: number[] = [];

  for (const t of turnos) {
    const enEspera = transicionMasReciente(t, 'en_espera');
    const enAtencion = transicionMasReciente(t, 'en_atencion');
    const atendido = transicionMasReciente(t, 'atendido');

    if (enEspera && enAtencion) {
      esperasReales.push(minutosEntre(enEspera, enAtencion));
      if (t.estimacion) {
        const medioEstimadoMs = (t.estimacion.desde.toMillis() + t.estimacion.hasta.toMillis()) / 2;
        esperasEstimadas.push((medioEstimadoMs - t.creadoEn.toMillis()) / 60_000);
      }
    }
    if (enAtencion && atendido) {
      atenciones.push(minutosEntre(enAtencion, atendido));
    }
  }

  const porDiaMapa = new Map<string, number>();
  for (const t of atendidos) {
    const fecha = transicionMasReciente(t, 'atendido') ?? t.creadoEn.toDate();
    const clave = fechaISO(fecha);
    porDiaMapa.set(clave, (porDiaMapa.get(clave) ?? 0) + 1);
  }
  const porDia: ConteoPorDia[] = [...porDiaMapa.entries()]
    .map(([fecha, total]) => ({
      fecha,
      etiqueta: new Date(`${fecha}T00:00:00`).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }),
      total,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-14);

  const porHora: ConteoPorHora[] = Array.from({ length: 24 }, (_, hora) => ({ hora, total: 0 }));
  for (const t of turnos) {
    porHora[t.creadoEn.toDate().getHours()].total++;
  }

  return {
    total: turnos.length,
    atendidos: atendidos.length,
    cancelados: cancelados.length,
    tasaCancelacionPct: turnos.length ? (cancelados.length / turnos.length) * 100 : null,
    esperaPromedioRealMin: promedio(esperasReales),
    esperaPromedioRealN: esperasReales.length,
    esperaPromedioEstimadaMin: promedio(esperasEstimadas),
    esperaPromedioEstimadaN: esperasEstimadas.length,
    atencionPromedioMin: promedio(atenciones),
    atencionPromedioN: atenciones.length,
    porArea: contarPor(turnos, (t) => t.areaId),
    porAsesor: contarPor(atendidos, (t) => t.asesorUid),
    porDia,
    porHora,
  };
}
