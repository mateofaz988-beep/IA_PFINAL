import { Component, inject, signal } from '@angular/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase/firebase';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-hacerme-admin',
  standalone: true,
  template: `
    <div class="mx-auto max-w-2xl px-4 py-12">
      <div class="rounded-xl border-2 border-orange-500 bg-orange-50 p-6">
        <h1 class="text-2xl font-bold text-orange-900 mb-4">⚠️ Herramienta de Desarrollo</h1>
        <p class="text-orange-800 mb-6">
          Esta herramienta cambia tu rol a <strong>administrador</strong> directamente en Firestore.
          Solo úsala en desarrollo.
        </p>

        @if (error()) {
          <div class="mb-4 p-4 bg-red-100 border border-red-400 rounded text-red-900">
            {{ error() }}
          </div>
        }

        @if (exito()) {
          <div class="mb-4 p-4 bg-green-100 border border-green-400 rounded text-green-900">
            ✅ ¡Rol cambiado a administrador! Recarga la página para ver los cambios.
          </div>
          <button
            (click)="recargar()"
            class="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            Recargar Página
          </button>
        } @else {
          <button
            [disabled]="procesando()"
            (click)="hacermeAdmin()"
            class="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
          >
            @if (procesando()) {
              Procesando...
            } @else {
              Hacerme Administrador
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class HacermeAdmin {
  private readonly authService = inject(AuthService);

  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal(false);

  async hacermeAdmin(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('No hay usuario autenticado');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        rol: 'admin',
      });
      this.exito.set(true);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cambiar el rol');
    } finally {
      this.procesando.set(false);
    }
  }

  recargar(): void {
    window.location.reload();
  }
}
