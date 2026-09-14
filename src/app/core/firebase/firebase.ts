import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

/**
 * Instancia única de la app de Firebase. Varios servicios (AuthService,
 * UsuariosService, AreasService...) necesitan la misma instancia — llamar
 * initializeApp() más de una vez con la misma config lanza un error.
 */
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);

export const firebaseAuth: Auth = getAuth(firebaseApp);

export const db: Firestore = getFirestore(firebaseApp);
