import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AreasService } from '../../../../core/services/areas.service';
import { ModulosService } from '../../../../core/services/modulos.service';
import { VehiculosService } from '../../../../core/services/vehiculos.service';

@Component({
  selector: 'app-admin-seed',
  standalone: true,
  templateUrl: './seed.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSeed {
  private readonly areasService = inject(AreasService);
  private readonly modulosService = inject(ModulosService);
  private readonly vehiculosService = inject(VehiculosService);

  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });
  readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });
  readonly vehiculos = toSignal(this.vehiculosService.listar(), { initialValue: [] });

  readonly sembrando = signal(false);
  readonly resultado = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async sembrar(): Promise<void> {
    this.sembrando.set(true);
    this.resultado.set(null);
    this.error.set(null);

    try {
      const [areasCreadas, modulosCreados, vehiculosCreados] = await Promise.all([
        this.areasService.sembrarEjemplo(),
        this.modulosService.sembrarEjemplo(),
        this.vehiculosService.sembrarEjemplos(),
      ]);

      if (areasCreadas === 0 && modulosCreados === 0 && vehiculosCreados === 0) {
        this.resultado.set('Ya existían datos — no se sembró nada para no duplicar.');
      } else {
        const mensajes: string[] = [];
        if (areasCreadas > 0) mensajes.push(`${areasCreadas} áreas`);
        if (modulosCreados > 0) mensajes.push(`${modulosCreados} módulos`);
        if (vehiculosCreados > 0) mensajes.push(`${vehiculosCreados} vehículos`);
        this.resultado.set(`Se crearon: ${mensajes.join(', ')}.`);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo sembrar los datos de ejemplo.');
    } finally {
      this.sembrando.set(false);
    }
  }
}
