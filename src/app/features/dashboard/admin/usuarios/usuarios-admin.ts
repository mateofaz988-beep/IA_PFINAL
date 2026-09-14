import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModulosService } from '../../../../core/services/modulos.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { Rol, Usuario } from '../../../../core/models/usuario.model';

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  templateUrl: './usuarios-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosAdmin {
  private readonly usuariosService = inject(UsuariosService);
  private readonly modulosService = inject(ModulosService);

  readonly usuarios = toSignal(this.usuariosService.listarTodos(), { initialValue: [] });
  private readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });

  readonly busqueda = signal('');
  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) {
      return this.usuarios();
    }
    return this.usuarios().filter(
      (u) =>
        u.nombre.toLowerCase().includes(texto) ||
        u.correo.toLowerCase().includes(texto) ||
        u.cedula.includes(texto),
    );
  });

  readonly cambiando = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  nombreModulo(moduloId: string | null): string | null {
    if (!moduloId) {
      return null;
    }
    return this.modulos().find((m) => m.id === moduloId)?.nombre ?? null;
  }

  async cambiarRol(usuario: Usuario, event: Event): Promise<void> {
    const nuevoRol = (event.target as HTMLSelectElement).value as Rol;
    if (nuevoRol === usuario.rol) {
      return;
    }
    this.cambiando.set(usuario.uid);
    this.error.set(null);
    try {
      await this.usuariosService.cambiarRol(usuario.uid, nuevoRol);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cambiar el rol.');
    } finally {
      this.cambiando.set(null);
    }
  }
}
