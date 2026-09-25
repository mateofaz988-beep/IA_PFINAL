import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AreasService } from '../../../../core/services/areas.service';
import { ModulosService } from '../../../../core/services/modulos.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { Modulo } from '../../../../core/models/modulo.model';

@Component({
  selector: 'app-modulos-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './modulos-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulosAdmin {
  private readonly modulosService = inject(ModulosService);
  private readonly areasService = inject(AreasService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly fb = inject(FormBuilder);

  readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });
  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });
  readonly usuarios = toSignal(this.usuariosService.listarTodos(), { initialValue: [] });

  /** Candidatos a asesor: cualquiera que no sea ya administrador (a un asesor sí se lo puede reasignar de módulo). */
  readonly candidatosAsesor = computed(() => this.usuarios().filter((u) => u.rol !== 'admin'));

  readonly editando = signal<Modulo | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly asignando = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    areaId: ['', Validators.required],
    estado: ['activo' as 'activo' | 'inactivo', Validators.required],
  });

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? areaId;
  }

  nombreAsesor(asesorUid: string | null): string {
    if (!asesorUid) {
      return 'Sin asignar';
    }
    return this.usuarios().find((u) => u.uid === asesorUid)?.nombre ?? 'Usuario eliminado';
  }

  nuevo(): void {
    this.editando.set(null);
    this.error.set(null);
    this.form.reset({ nombre: '', areaId: this.areas()[0]?.id ?? '', estado: 'activo' });
  }

  editar(modulo: Modulo): void {
    this.editando.set(modulo);
    this.error.set(null);
    this.form.reset({ nombre: modulo.nombre, areaId: modulo.areaId, estado: modulo.estado });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    const datos = this.form.getRawValue();

    try {
      const actual = this.editando();
      if (actual) {
        await this.modulosService.actualizar(actual.id, datos);
      } else {
        await this.modulosService.crear(datos);
      }
      this.nuevo();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo guardar el módulo.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(modulo: Modulo): Promise<void> {
    if (!confirm(`¿Eliminar "${modulo.nombre}"?`)) {
      return;
    }
    try {
      await this.modulosService.eliminar(modulo.id);
      if (this.editando()?.id === modulo.id) {
        this.nuevo();
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo eliminar el módulo.');
    }
  }

  async cambiarAsesor(modulo: Modulo, event: Event): Promise<void> {
    const uid = (event.target as HTMLSelectElement).value || null;
    this.asignando.set(modulo.id);
    this.error.set(null);
    try {
      await this.modulosService.asignarAsesor(modulo.id, uid);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo asignar el asesor.');
    } finally {
      this.asignando.set(null);
    }
  }
}
