import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AreasService } from '../../../../core/services/areas.service';
import { Area } from '../../../../core/models/area.model';

@Component({
  selector: 'app-areas-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './areas-admin.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasAdmin {
  private readonly areasService = inject(AreasService);
  private readonly fb = inject(FormBuilder);

  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });

  readonly editando = signal<Area | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    prefijo: ['', [Validators.required, Validators.maxLength(3)]],
    duracionEstimadaMin: [20, [Validators.required, Validators.min(1)]],
    activa: [true],
    requiereFoto: [false],
  });

  nueva(): void {
    this.editando.set(null);
    this.error.set(null);
    this.form.reset({
      nombre: '',
      descripcion: '',
      prefijo: '',
      duracionEstimadaMin: 20,
      activa: true,
      requiereFoto: false,
    });
  }

  editar(area: Area): void {
    this.editando.set(area);
    this.error.set(null);
    this.form.reset({
      nombre: area.nombre,
      descripcion: area.descripcion,
      prefijo: area.prefijo,
      duracionEstimadaMin: area.duracionEstimadaMin,
      activa: area.activa,
      requiereFoto: area.requiereFoto,
    });
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
        await this.areasService.actualizar(actual.id, datos);
      } else {
        await this.areasService.crear(datos);
      }
      this.nueva();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo guardar el área.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(area: Area): Promise<void> {
    if (!confirm(`¿Eliminar "${area.nombre}"? Los turnos que ya la referencian no se ven afectados.`)) {
      return;
    }
    try {
      await this.areasService.eliminar(area.id);
      if (this.editando()?.id === area.id) {
        this.nueva();
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo eliminar el área.');
    }
  }
}
