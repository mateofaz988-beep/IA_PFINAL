import { Injectable } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase/firebase';
import { Modulo, ModuloDoc } from '../models/modulo.model';
import { EstadoTurno } from '../models/turno.model';
import { UsuarioDoc } from '../models/usuario.model';
import { AREAS_EJEMPLO } from './areas.service';

/**
 * true si el módulo tiene ahora mismo un turno en alguno de esos estados.
 * La usan las reasignaciones de admin (módulos y usuarios) para no dejar
 * un turno en_atencion sin nadie que pueda finalizarlo o cancelarlo: si
 * al asesor le cambian el rol o lo mueven de módulo a media atención, ese
 * turno queda huérfano — ni su panel ni el del nuevo asesor lo ven.
 */
export async function tieneTurnosEnEstados(moduloId: string, estados: EstadoTurno[]): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, 'turnos'), where('moduloId', '==', moduloId), where('estado', 'in', estados), limit(1)),
  );
  return !snap.empty;
}

/** Un módulo de ejemplo por área — el admin agrega más desde el CRUD (fase 4). */
function modulosEjemplo(): Record<string, ModuloDoc> {
  const modulos: Record<string, ModuloDoc> = {};
  for (const areaId of Object.keys(AREAS_EJEMPLO)) {
    modulos[`${areaId}-1`] = {
      nombre: 'Módulo 1',
      areaId,
      asesorUid: null,
      estado: 'activo',
    };
  }
  return modulos;
}

function toModulo(snap: QueryDocumentSnapshot<DocumentData>): Modulo {
  return { id: snap.id, ...(snap.data() as ModuloDoc) };
}

@Injectable({ providedIn: 'root' })
export class ModulosService {
  listar(): Observable<Modulo[]> {
    return new Observable<Modulo[]>((subscriber) => {
      const q = query(collection(db, 'modulos'), orderBy('nombre'));
      return onSnapshot(
        q,
        (snap) => subscriber.next(snap.docs.map(toModulo)),
        (error) => subscriber.error(error),
      );
    });
  }

  /** Siembra un módulo de ejemplo por área si la colección todavía está vacía. Idempotente. */
  async sembrarEjemplo(): Promise<number> {
    const existentes = await getDocs(collection(db, 'modulos'));
    if (!existentes.empty) {
      return 0;
    }

    const modulos = modulosEjemplo();
    const batch = writeBatch(db);
    for (const [id, modulo] of Object.entries(modulos)) {
      batch.set(doc(db, 'modulos', id), modulo);
    }
    await batch.commit();
    return Object.keys(modulos).length;
  }

  async crear(modulo: Omit<ModuloDoc, 'asesorUid'>): Promise<void> {
    await addDoc(collection(db, 'modulos'), { ...modulo, asesorUid: null });
  }

  async actualizar(id: string, cambios: Partial<Omit<ModuloDoc, 'asesorUid'>>): Promise<void> {
    await updateDoc(doc(db, 'modulos', id), cambios);
  }

  /** Elimina el módulo y libera al asesor que tuviera asignado, si tenía uno. */
  async eliminar(id: string): Promise<void> {
    if (await tieneTurnosEnEstados(id, ['en_espera', 'en_atencion'])) {
      throw new Error('Este módulo tiene turnos en espera o en atención — no se puede eliminar todavía.');
    }

    const snap = await getDoc(doc(db, 'modulos', id));
    const asesorUid = snap.exists() ? (snap.data() as ModuloDoc).asesorUid : null;

    const batch = writeBatch(db);
    if (asesorUid) {
      batch.update(doc(db, 'usuarios', asesorUid), { moduloId: null } satisfies Partial<UsuarioDoc>);
    }
    batch.delete(doc(db, 'modulos', id));
    await batch.commit();
  }

  /**
   * Asigna (o quita, con uid null) el asesor de un módulo, manteniendo
   * sincronizadas las dos referencias cruzadas: modulos/{id}.asesorUid y
   * usuarios/{uid}.moduloId. Si el módulo ya tenía otro asesor, lo libera;
   * si el usuario ya estaba en otro módulo, lo libera también.
   */
  async asignarAsesor(moduloId: string, uid: string | null): Promise<void> {
    const moduloSnap = await getDoc(doc(db, 'modulos', moduloId));
    if (!moduloSnap.exists()) {
      throw new Error('El módulo ya no existe.');
    }
    const moduloActual = moduloSnap.data() as ModuloDoc;

    if (moduloActual.asesorUid !== uid && (await tieneTurnosEnEstados(moduloId, ['en_atencion']))) {
      throw new Error('Este módulo tiene un turno en atención — finalízalo o cancélalo antes de reasignar el asesor.');
    }

    const batch = writeBatch(db);

    if (moduloActual.asesorUid && moduloActual.asesorUid !== uid) {
      batch.update(doc(db, 'usuarios', moduloActual.asesorUid), { moduloId: null } satisfies Partial<UsuarioDoc>);
    }

    if (uid) {
      const usuarioSnap = await getDoc(doc(db, 'usuarios', uid));
      const moduloAnteriorId = usuarioSnap.exists() ? (usuarioSnap.data() as UsuarioDoc).moduloId : null;
      if (moduloAnteriorId && moduloAnteriorId !== moduloId) {
        batch.update(doc(db, 'modulos', moduloAnteriorId), { asesorUid: null } satisfies Partial<ModuloDoc>);
      }
      batch.update(doc(db, 'usuarios', uid), { rol: 'vendedor', moduloId } satisfies Partial<UsuarioDoc>);
    }

    batch.update(doc(db, 'modulos', moduloId), { asesorUid: uid } satisfies Partial<ModuloDoc>);
    await batch.commit();
  }
}
