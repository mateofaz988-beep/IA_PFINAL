import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AreasService } from '../../../../core/services/areas.service';
import { ModulosService } from '../../../../core/services/modulos.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { estimacionEnVivo, posicionEnCola } from '../../../../core/utils/estimacion.util';

@Component({
  selector: 'app-mi-turno',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './mi-turno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiTurno {
  private readonly route = inject(ActivatedRoute);
  private readonly turnosService = inject(TurnosService);
  private readonly areasService = inject(AreasService);
  private readonly modulosService = inject(ModulosService);

  readonly turno = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('id')!),
      switchMap((id) => this.turnosService.turnoPorId(id)),
    ),
    { initialValue: null },
  );

  private readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });
  private readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });

  readonly area = computed(() => this.areas().find((a) => a.id === this.turno()?.areaId) ?? null);
  readonly modulo = computed(() => this.modulos().find((m) => m.id === this.turno()?.moduloId) ?? null);

  /** Deriva de turno() en vez de volver a leer la ruta — un solo listener por turno, no dos. */
  private readonly colaDelModulo = toSignal(
    toObservable(this.turno).pipe(
      map((turno) => turno?.moduloId ?? null),
      distinctUntilChanged(),
      switchMap((moduloId) => (moduloId ? this.turnosService.colaYAtencionDelModulo(moduloId) : of([]))),
    ),
    { initialValue: [] },
  );

  /** Se refresca cada minuto para que el rango no se quede desactualizado aunque nadie más cambie de estado. */
  private readonly ahora = signal(new Date());

  readonly rango = computed(() => {
    const turno = this.turno();
    const area = this.area();
    if (!turno || !area || turno.estado !== 'en_espera') {
      return null;
    }
    return estimacionEnVivo(turno, this.colaDelModulo(), area.duracionEstimadaMin, this.ahora());
  });

  readonly posicion = computed(() => {
    const turno = this.turno();
    if (!turno || turno.estado !== 'en_espera') {
      return null;
    }
    return posicionEnCola(turno, this.colaDelModulo());
  });

  readonly cancelando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const intervalo = setInterval(() => this.ahora.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  puedeCancelar(): boolean {
    const estado = this.turno()?.estado;
    return estado === 'pendiente' || estado === 'en_espera';
  }

  async cancelar(): Promise<void> {
    const turno = this.turno();
    if (!turno || this.cancelando()) {
      return;
    }
    this.cancelando.set(true);
    this.error.set(null);
    try {
      await this.turnosService.cancelar(turno.id);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cancelar el turno.');
    } finally {
      this.cancelando.set(false);
    }
  }
}
