import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, of, switchMap } from 'rxjs';
import { AreasService } from '../../../../core/services/areas.service';
import { ModulosService } from '../../../../core/services/modulos.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';

@Component({
  selector: 'app-asesor-panel',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsesorPanel {
  private readonly usuariosService = inject(UsuariosService);
  private readonly turnosService = inject(TurnosService);
  private readonly areasService = inject(AreasService);
  private readonly modulosService = inject(ModulosService);

  readonly moduloId = computed(() => this.usuariosService.perfil()?.moduloId ?? null);

  private readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });
  private readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });

  readonly modulo = computed(() => this.modulos().find((m) => m.id === this.moduloId()) ?? null);
  readonly area = computed(() => this.areas().find((a) => a.id === this.modulo()?.areaId) ?? null);

  private readonly turnosDelModulo = toSignal(
    toObservable(this.moduloId).pipe(
      distinctUntilChanged(),
      switchMap((id) => (id ? this.turnosService.colaYAtencionDelModulo(id) : of([]))),
    ),
    { initialValue: [] },
  );

  readonly enAtencion = computed(() => this.turnosDelModulo().find((t) => t.estado === 'en_atencion') ?? null);
  readonly enEspera = computed(() =>
    this.turnosDelModulo()
      .filter((t) => t.estado === 'en_espera')
      .map((t, i) => ({ turno: t, posicion: i + 1 })),
  );

  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);

  async llamarSiguiente(): Promise<void> {
    const moduloId = this.moduloId();
    if (!moduloId || this.procesando() || this.enAtencion()) {
      return;
    }
    this.procesando.set(true);
    this.error.set(null);
    try {
      const huboTurno = await this.turnosService.llamarSiguiente(moduloId);
      if (!huboTurno) {
        this.error.set('No hay turnos en espera.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo llamar al siguiente turno.');
    } finally {
      this.procesando.set(false);
    }
  }

  async finalizar(): Promise<void> {
    const turno = this.enAtencion();
    if (!turno || this.procesando()) {
      return;
    }
    this.procesando.set(true);
    this.error.set(null);
    try {
      await this.turnosService.finalizarAtencion(turno.id);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo finalizar la atención.');
    } finally {
      this.procesando.set(false);
    }
  }

  async cancelarActual(): Promise<void> {
    const turno = this.enAtencion();
    if (!turno || this.procesando()) {
      return;
    }
    this.procesando.set(true);
    this.error.set(null);
    try {
      await this.turnosService.cancelar(turno.id);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No se pudo cancelar el turno.');
    } finally {
      this.procesando.set(false);
    }
  }
}
