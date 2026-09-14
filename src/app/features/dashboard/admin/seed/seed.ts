import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AreasService } from '../../../../core/services/areas.service';
import { ModulosService } from '../../../../core/services/modulos.service';

@Component({
  selector: 'app-admin-seed',
  standalone: true,
  templateUrl: './seed.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSeed {
  private readonly areasService = inject(AreasService);
  private readonly modulosService = inject(ModulosService);

  readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });
  readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });

  readonly sembrando = signal(false);
  readonly resultado = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async sembrar(): Promise<void> {
    this.sembrando.set(true);
    this.resultado.set(null);
    this.error.set(null);

    try {
      const [areasCreadas, modulosCreados] = await Promise.all([
        this.areasService.sembrarEjemplo(),
        this.modulosService.sembrarEjemplo(),
      ]);

      this.resultado.set(
        areasCreadas === 0 && modulosCreados === 0
          ? 'Ya existían datos — no se sembró nada para no duplicar.'
          : `Se crearon ${areasCreadas} áreas y ${modulosCreados} módulos.`,
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo sembrar los datos de ejemplo.');
    } finally {
      this.sembrando.set(false);
    }
  }
}
