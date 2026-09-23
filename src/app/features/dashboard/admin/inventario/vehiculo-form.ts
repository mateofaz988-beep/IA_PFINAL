import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VehiculosService } from '../../../../core/services/vehiculos.service';
import { VehiculoInput } from '../../../../core/models/vehiculo.model';

@Component({
  selector: 'app-vehiculo-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './vehiculo-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiculoForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vehiculosService = inject(VehiculosService);

  readonly vehiculoId = signal<string | null>(null);
  readonly modoEdicion = computed(() => !!this.vehiculoId());
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    marca: ['', [Validators.required, Validators.minLength(2)]],
    modelo: ['', [Validators.required, Validators.minLength(2)]],
    version: ['', Validators.required],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(2100)]],
    categoria: ['sedan', Validators.required],
    tipo: ['nuevo', Validators.required],
    precio: [0, [Validators.required, Validators.min(0)]],
    moneda: ['USD', Validators.required],
    precioAnterior: [null, Validators.min(0)],
    kilometraje: [0, [Validators.required, Validators.min(0)]],
    transmision: ['automatica', Validators.required],
    combustible: ['gasolina', Validators.required],
    motor: [''],
    potencia: [''],
    cilindros: [null, Validators.min(1)],
    color: [''],
    colorInterior: [''],
    traccion: ['delantera'],
    puertas: [4, [Validators.min(2), Validators.max(6)]],
    pasajeros: [5, [Validators.min(1), Validators.max(12)]],
    vin: [''],
    placa: [''],
    disponibilidad: ['disponible', Validators.required],
    destacado: [false],
    oferta: [false],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    caracteristicas: [''],
    equipamiento: [''],
    imagenPrincipal: [''],
    imagenes: [''],
  });

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.vehiculoId.set(id);
        this.cargarVehiculo(id);
      }
    });
  }

  private async cargarVehiculo(id: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const vehiculo = await this.vehiculosService.obtenerPorId(id);
      if (!vehiculo) {
        this.error.set('Vehículo no encontrado.');
        return;
      }
      this.form.patchValue({
        ...vehiculo,
        caracteristicas: vehiculo.caracteristicas?.join('\n') || '',
        equipamiento: vehiculo.equipamiento?.join('\n') || '',
        imagenes: vehiculo.imagenes?.map(img => img.url).join('\n') || '',
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cargar el vehículo.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    try {
      const valores = this.form.value;
      const input: VehiculoInput = {
        ...valores,
        caracteristicas: valores.caracteristicas
          ? valores.caracteristicas
              .split('\n')
              .map((c: string) => c.trim())
              .filter(Boolean)
          : [],
        equipamiento: valores.equipamiento
          ? valores.equipamiento
              .split('\n')
              .map((e: string) => e.trim())
              .filter(Boolean)
          : [],
        imagenes: valores.imagenes
          ? valores.imagenes
              .split('\n')
              .map((url: string) => url.trim())
              .filter(Boolean)
              .map((url: string, index: number) => ({
                url,
                orden: index + 1,
                tipo: 'exterior' as const,
              }))
          : [],
      };

      if (this.modoEdicion()) {
        await this.vehiculosService.actualizar(this.vehiculoId()!, input);
      } else {
        await this.vehiculosService.crear(input);
      }

      this.router.navigate(['/dashboard/admin/inventario']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo guardar el vehículo.');
      this.guardando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/inventario']);
  }
}
