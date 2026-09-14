import { Injectable, signal } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth } from '../firebase/firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = firebaseAuth;
  private readonly authReady: Promise<void>;

  /** Usuario de Firebase actualmente autenticado (o null). */
  readonly currentUser = signal<User | null>(null);
  /** true mientras Firebase todavía no resolvió el estado inicial de sesión. */
  readonly isLoading = signal(true);

  constructor() {
    let resolveReady!: () => void;
    this.authReady = new Promise((resolve) => (resolveReady = resolve));

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      this.isLoading.set(false);
      resolveReady();
    });
  }

  /** Se resuelve cuando Firebase ya determinó si hay sesión activa. Úsalo en guards. */
  ready(): Promise<void> {
    return this.authReady;
  }

  async register(email: string, password: string, displayName: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }
    return credential.user;
  }

  async login(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    return user ? user.getIdToken() : Promise.resolve(null);
  }
}
