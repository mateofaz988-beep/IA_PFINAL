import { Injectable } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase/firebase';
import { Area, AreaDoc } from '../models/area.model';

/** Áreas de ejemplo del punto 2 del encargo — id fijo (slug) para que módulos y el resto del código las puedan referenciar sin buscarlas primero. */
const AREAS_EJEMPLO: Record<string, AreaDoc> = {
  'venta-nueva': {
    nombre: 'Venta de vehículo nuevo',
    descripcion: 'Cotización y venta de vehículos nuevos del catálogo.',
    prefijo: 'VN',
    duracionEstimadaMin: 30,
    activa: true,
    requiereFoto: false,
  },
  avaluo: {
    nombre: 'Avalúo de vehículo usado',
    descripcion: 'Recepción a cuenta de un vehículo usado, con identificación fotográfica.',
    prefijo: 'AV',
    duracionEstimadaMin: 20,
    activa: true,
    requiereFoto: true,
  },
  financiamiento: {
    nombre: 'Financiamiento y crédito',
    descripcion: 'Evaluación de crédito para la compra de un vehículo.',
    prefijo: 'FC',
    duracionEstimadaMin: 25,
    activa: true,
    requiereFoto: false,
  },
  taller: {
    nombre: 'Taller y servicio técnico',
    descripcion: 'Mantenimiento y reparación de vehículos.',
    prefijo: 'TS',
    duracionEstimadaMin: 40,
    activa: true,
    requiereFoto: false,
  },
  entrega: {
    nombre: 'Entrega de vehículo',
    descripcion: 'Entrega de un vehículo nuevo o usado ya facturado.',
    prefijo: 'EV',
    duracionEstimadaMin: 15,
    activa: true,
    requiereFoto: false,
  },
};

function toArea(snap: QueryDocumentSnapshot<DocumentData>): Area {
  return { id: snap.id, ...(snap.data() as AreaDoc) };
}

@Injectable({ providedIn: 'root' })
export class AreasService {
  /** Lista reactiva de todas las áreas — el admin filtra por activa en pantalla, no aquí. */
  listar(): Observable<Area[]> {
    return new Observable<Area[]>((subscriber) => {
      const q = query(collection(db, 'areas'), orderBy('nombre'));
      return onSnapshot(
        q,
        (snap) => subscriber.next(snap.docs.map(toArea)),
        (error) => subscriber.error(error),
      );
    });
  }

  /** Siembra las áreas de ejemplo si la colección todavía está vacía. Idempotente. */
  async sembrarEjemplo(): Promise<number> {
    const existentes = await getDocs(collection(db, 'areas'));
    if (!existentes.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    for (const [id, area] of Object.entries(AREAS_EJEMPLO)) {
      batch.set(doc(db, 'areas', id), area);
    }
    await batch.commit();
    return Object.keys(AREAS_EJEMPLO).length;
  }

  async crear(area: AreaDoc): Promise<void> {
    await addDoc(collection(db, 'areas'), area);
  }

  async actualizar(id: string, cambios: Partial<AreaDoc>): Promise<void> {
    await updateDoc(doc(db, 'areas', id), cambios);
  }

  async eliminar(id: string): Promise<void> {
    await deleteDoc(doc(db, 'areas', id));
  }
}

export { AREAS_EJEMPLO };
