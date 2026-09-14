import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase/firebase';
import { ModuloDoc } from '../models/modulo.model';
import { Rol, Usuario, UsuarioDoc } from '../models/usuario.model';
import { AuthService } from './auth.service';
import { tieneTurnosEnEstados } from './modulos.service';

function toUsuario(snap: DocumentSnapshot<DocumentData>): Usuario | null {
  if (!snap.exists()) {
    return null;
  }
  return { uid: snap.id, ...(snap.data() as Omit<Usuario, 'uid'>) };
}

/** Datos capturados en el formulario de registro (ver Register). */
export interface DatosRegistroUsuario {
  nombre: string;
  correo: string;
  cedula: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly authService = inject(AuthService);

  /** Perfil de Firestore del usuario autenticado; se actualiza solo si algo lo cambia (ej. un admin sube de rol a alguien). */
  readonly perfil = signal<Usuario | null>(null);
  readonly rol = computed<Rol | null>(() => this.perfil()?.rol ?? null);

  private unsubscribePerfil?: Unsubscribe;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();

      this.unsubscribePerfil?.();
      this.unsubscribePerfil = undefined;

      if (!user) {
        this.perfil.set(null);
        return;
      }

      this.unsubscribePerfil = onSnapshot(doc(db, 'usuarios', user.uid), (snap) => {
        this.perfil.set(toUsuario(snap));
      });
    });
  }

  /** Crea el documento de perfil al registrarse. Siempre como 'cliente' — las reglas de Firestore lo exigen igual. */
  async crearPerfil(uid: string, datos: DatosRegistroUsuario): Promise<void> {
    await setDoc(doc(db, 'usuarios', uid), {
      nombre: datos.nombre,
      correo: datos.correo,
      cedula: datos.cedula,
      telefono: datos.telefono,
      rol: 'cliente' satisfies Rol,
      moduloId: null,
      creadoEn: serverTimestamp(),
    });
  }

  /** Lectura puntual (no reactiva) — la usa roleGuard para decidir si una ruta se puede activar. */
  async obtenerPerfil(uid: string): Promise<Usuario | null> {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    return toUsuario(snap);
  }

  /** Todos los usuarios, para el panel de administración — las reglas exigen que quien llama sea admin. */
  listarTodos(): Observable<Usuario[]> {
    return new Observable<Usuario[]>((subscriber) => {
      const q = query(collection(db, 'usuarios'), orderBy('nombre'));
      return onSnapshot(
        q,
        (snap) => subscriber.next(snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => toUsuario(d)!)),
        (error) => subscriber.error(error),
      );
    });
  }

  /**
   * Cambia el rol de un usuario. Si deja de ser asesor, libera el módulo
   * que tuviera asignado (y ese módulo queda sin asesor) para no dejar
   * referencias cruzadas apuntando a alguien que ya no puede atender.
   */
  async cambiarRol(uid: string, nuevoRol: Rol): Promise<void> {
    if (nuevoRol === 'asesor') {
      await updateDoc(doc(db, 'usuarios', uid), { rol: nuevoRol } satisfies Partial<UsuarioDoc>);
      return;
    }

    const snap = await getDoc(doc(db, 'usuarios', uid));
    const moduloId = snap.exists() ? (snap.data() as UsuarioDoc).moduloId : null;

    if (moduloId && (await tieneTurnosEnEstados(moduloId, ['en_atencion']))) {
      throw new Error(
        'Este usuario tiene un turno en atención en su módulo — finalízalo o cancélalo antes de cambiarle el rol.',
      );
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'usuarios', uid), { rol: nuevoRol, moduloId: null } satisfies Partial<UsuarioDoc>);
    if (moduloId) {
      batch.update(doc(db, 'modulos', moduloId), { asesorUid: null } satisfies Partial<ModuloDoc>);
    }
    await batch.commit();
  }
}
