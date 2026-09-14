import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AreasService } from '../../../../core/services/areas.service';
import { ClasificadorVehiculoService } from '../../../../core/services/clasificador-vehiculo.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { Area } from '../../../../core/models/area.model';
import { DatosVehiculo } from '../../../../core/models/turno.model';
import { fileToBase64 } from '../../../../core/utils/file-to-base64.util';
import { construirDatosVehiculo } from '../../../../core/utils/vehiculo.util';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './solicitar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitarTurno {
  private readonly areasService = inject(AreasService);
  private readonly turnosService = inject(TurnosService);
  private readonly clasificadorService = inject(ClasificadorVehiculoService);
  private readonly router = inject(Router);

  private readonly areasTodas = toSignal(this.areasService.listar(), { initialValue: [] });
  readonly areas = computed(() => this.areasTodas().filter((a) => a.activa));

  readonly seleccionada = signal<Area | null>(null);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly imagenPreview = signal<string | null>(null);
  readonly analizando = signal(false);
  readonly resultadoVehiculo = signal<DatosVehiculo | null>(null);
  readonly errorFoto = signal<string | null>(null);

  readonly puedeEnviar = computed(() => {
    const area = this.seleccionada();
    if (!area || this.enviando()) {
      return false;
    }
    if (area.requiereFoto) {
      return !this.analizando() && this.resultadoVehiculo() !== null;
    }
    return true;
  });

  /** Invalida cualquier análisis en curso cuyo resultado ya no aplique (cambio de área o de foto a medio análisis). */
  private analisisToken = 0;

  elegir(area: Area): void {
    if (this.seleccionada()?.id === area.id) {
      return;
    }
    this.analisisToken++;
    this.seleccionada.set(area);
    this.error.set(null);
    this.imagenPreview.set(null);
    this.resultadoVehiculo.set(null);
    this.errorFoto.set(null);
    this.analizando.set(false);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }

    const token = ++this.analisisToken;
    this.resultadoVehiculo.set(null);
    this.errorFoto.set(null);

    const base64 = await fileToBase64(file);
    if (token !== this.analisisToken) {
      return;
    }
    this.imagenPreview.set(base64);

    this.analizando.set(true);
    try {
      const { prefiltro, clasificacion } = await this.clasificadorService.clasificar(base64);
      if (token !== this.analisisToken) {
        return;
      }
      this.resultadoVehiculo.set(construirDatosVehiculo(prefiltro, clasificacion));
    } catch (err) {
      if (token !== this.analisisToken) {
        return;
      }
      this.errorFoto.set(
        err instanceof Error ? err.message : 'No se pudo analizar la fotografía. Intenta de nuevo.',
      );
    } finally {
      if (token === this.analisisToken) {
        this.analizando.set(false);
      }
    }
  }

  async solicitar(): Promise<void> {
    const area = this.seleccionada();
    if (!area || !this.puedeEnviar()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    try {
      const id = await this.turnosService.crearTurno(area, this.resultadoVehiculo());
      await this.router.navigate(['/dashboard/turnos', id]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo crear el turno.');
    } finally {
      this.enviando.set(false);
    }
  }
}
