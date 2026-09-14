import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase/firebase';
import { Area } from '../models/area.model';
import { Modulo, ModuloDoc } from '../models/modulo.model';
import { DatosVehiculo, EstadoTurno, Turno, TurnoDoc } from '../models/turno.model';
import { calcularRango, elegirModulo } from '../utils/estimacion.util';
import { AuthService } from './auth.service';
import { UsuariosService } from './usuarios.service';

/** Máquina de estados del punto 5 del encargo: ninguna transición retrocede. */
const TRANSICIONES_VALIDAS: Record<EstadoTurno, EstadoTurno[]> = {
  pendiente: ['en_espera', 'cancelado'],
  en_espera: ['en_atencion', 'cancelado'],
  en_atencion: ['atendido', 'cancelado'],
  atendido: [],
  cancelado: [],
};

function toTurno(snap: QueryDocumentSnapshot<DocumentData>): Turno {
  return { id: snap.id, ...(snap.data() as TurnoDoc) };
}

function fechaComoClave(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly authService = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);

  /**
   * Crea el turno: elige el módulo con la hora de inicio más temprana,
   * calcula el rango a mostrar, genera el código correlativo del día y
   * escribe el documento. Devuelve el id — la pantalla de "mi turno" se
   * suscribe a él por separado, así que no hace falta devolver el turno
   * completo (y el creadoEn con serverTimestamp() no se resuelve aquí).
   */
  async crearTurno(area: Area, vehiculo: DatosVehiculo | null = null): Promise<string> {
    const user = this.authService.currentUser();
    const perfil = this.usuariosService.perfil();
    if (!user || !perfil) {
      throw new Error('Debes iniciar sesión para pedir un turno.');
    }

    const modulosSnap = await getDocs(
      query(collection(db, 'modulos'), where('areaId', '==', area.id), where('estado', '==', 'activo')),
    );
    const modulos: Modulo[] = modulosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as ModuloDoc) }));
    if (modulos.length === 0) {
      throw new Error('No hay módulos activos para esta área en este momento.');
    }

    const turnosSnap = await getDocs(
      query(
        collection(db, 'turnos'),
        where('areaId', '==', area.id),
        where('estado', 'in', ['en_espera', 'en_atencion']),
      ),
    );
    const turnosActivos: Turno[] = turnosSnap.docs.map(toTurno);

    const ahora = new Date();
    const { modulo, inicioEstimado } = elegirModulo(modulos, turnosActivos, area.duracionEstimadaMin, ahora);
    const posicion = turnosActivos.filter((t) => t.moduloId === modulo.id && t.estado === 'en_espera').length;
    const rango = calcularRango(inicioEstimado, posicion, ahora);

    const codigo = await this.siguienteCodigo(area);
    const ref = doc(collection(db, 'turnos'));

    const turno = {
      codigo,
      clienteUid: user.uid,
      clienteNombre: perfil.nombre,
      areaId: area.id,
      moduloId: modulo.id,
      asesorUid: modulo.asesorUid,
      estado: 'en_espera' as const,
      vehiculo,
      estimacion: { desde: Timestamp.fromDate(rango.desde), hasta: Timestamp.fromDate(rango.hasta) },
      transiciones: [{ estado: 'en_espera' as const, en: Timestamp.now() }],
      creadoEn: Timestamp.now(),
    } satisfies TurnoDoc;

    await setDoc(ref, turno);
    return ref.id;
  }

  /** Turno individual, en vivo — lo usa la pantalla "mi turno". */
  turnoPorId(id: string): Observable<Turno | null> {
    return new Observable<Turno | null>((subscriber) => {
      return onSnapshot(
        doc(db, 'turnos', id),
        (snap) => subscriber.next(snap.exists() ? { id: snap.id, ...(snap.data() as TurnoDoc) } : null),
        (error) => subscriber.error(error),
      );
    });
  }

  /** Turnos del cliente autenticado, más reciente primero — historial. */
  misTurnos(): Observable<Turno[]> {
    const user = this.authService.currentUser();
    return new Observable<Turno[]>((subscriber) => {
      if (!user) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }
      const q = query(collection(db, 'turnos'), where('clienteUid', '==', user.uid), orderBy('creadoEn', 'desc'));
      return onSnapshot(q, (snap) => subscriber.next(snap.docs.map(toTurno)), (error) => subscriber.error(error));
    });
  }

  /**
   * Los últimos turnos de todo el sistema, para el panel de administración
   * — búsqueda y filtros se aplican en pantalla sobre este lote, no acá,
   * así se evita necesitar un índice compuesto por cada combinación de
   * filtro (área, estado, texto). El límite es generoso para una demo,
   * no para producción a escala.
   */
  turnosRecientes(maxResultados = 300): Observable<Turno[]> {
    return new Observable<Turno[]>((subscriber) => {
      const q = query(collection(db, 'turnos'), orderBy('creadoEn', 'desc'), limit(maxResultados));
      return onSnapshot(q, (snap) => subscriber.next(snap.docs.map(toTurno)), (error) => subscriber.error(error));
    });
  }

  /**
   * Todos los turnos activos del sistema (en_espera + en_atencion), sin
   * filtrar por módulo — la usa la pantalla de sala pública. Lectura
   * pública por diseño: las reglas de Firestore permiten leer turnos en
   * estos dos estados sin autenticación.
   */
  turnosActivosGlobal(): Observable<Turno[]> {
    return new Observable<Turno[]>((subscriber) => {
      const q = query(
        collection(db, 'turnos'),
        where('estado', 'in', ['en_espera', 'en_atencion']),
        orderBy('creadoEn', 'asc'),
      );
      return onSnapshot(q, (snap) => subscriber.next(snap.docs.map(toTurno)), (error) => subscriber.error(error));
    });
  }

  /**
   * Turnos activos (en_espera + en_atencion) de un módulo, en orden de
   * llegada. La usan el panel del asesor y el recálculo en vivo del
   * cliente — las reglas de Firestore ya permiten leer turnos en estos
   * dos estados sin más requisito (es la misma base de la pantalla de sala).
   */
  colaYAtencionDelModulo(moduloId: string): Observable<Turno[]> {
    return new Observable<Turno[]>((subscriber) => {
      const q = query(
        collection(db, 'turnos'),
        where('moduloId', '==', moduloId),
        where('estado', 'in', ['en_espera', 'en_atencion']),
        orderBy('creadoEn', 'asc'),
      );
      return onSnapshot(q, (snap) => subscriber.next(snap.docs.map(toTurno)), (error) => subscriber.error(error));
    });
  }

  /**
   * El asesor llama al turno más antiguo en espera de su módulo. false si
   * la cola está vacía. Refresca asesorUid al asesor actual del módulo en
   * este momento (no al que estaba asignado cuando se creó el turno) —
   * si el módulo cambió de asesor mientras el turno esperaba en cola, la
   * atribución en las estadísticas de "carga por asesor" queda correcta.
   */
  async llamarSiguiente(moduloId: string): Promise<boolean> {
    const moduloSnap = await getDoc(doc(db, 'modulos', moduloId));
    const asesorUid = moduloSnap.exists() ? (moduloSnap.data() as ModuloDoc).asesorUid : null;
    if (!asesorUid) {
      throw new Error('Este módulo no tiene un asesor asignado.');
    }

    const q = query(
      collection(db, 'turnos'),
      where('moduloId', '==', moduloId),
      where('estado', '==', 'en_espera'),
      orderBy('creadoEn', 'asc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return false;
    }
    await this.transicionar(snap.docs[0].id, 'en_atencion', { asesorUid });
    return true;
  }

  finalizarAtencion(turnoId: string): Promise<void> {
    return this.transicionar(turnoId, 'atendido');
  }

  cancelar(turnoId: string): Promise<void> {
    return this.transicionar(turnoId, 'cancelado');
  }

  private async transicionar(
    turnoId: string,
    nuevoEstado: EstadoTurno,
    camposExtra: Record<string, unknown> = {},
  ): Promise<void> {
    const ref = doc(db, 'turnos', turnoId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('El turno ya no existe.');
    }
    const actual = snap.data()['estado'] as EstadoTurno;
    if (!TRANSICIONES_VALIDAS[actual].includes(nuevoEstado)) {
      throw new Error(`No se puede pasar de "${actual}" a "${nuevoEstado}".`);
    }
    await updateDoc(ref, {
      estado: nuevoEstado,
      ...camposExtra,
      transiciones: arrayUnion({ estado: nuevoEstado, en: Timestamp.now() }),
    });
  }

  /** Correlativo por área, reiniciado cada día — transacción atómica sobre contadores/{areaId_YYYYMMDD}. */
  private async siguienteCodigo(area: Area): Promise<string> {
    const clave = `${area.id}_${fechaComoClave(new Date())}`;
    const ref = doc(db, 'contadores', clave);

    const siguiente = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const actual = snap.exists() ? (snap.data()['siguiente'] as number) : 0;
      const nuevo = actual + 1;
      tx.set(ref, { siguiente: nuevo });
      return nuevo;
    });

    return `${area.prefijo}-${String(siguiente).padStart(3, '0')}`;
  }
}
