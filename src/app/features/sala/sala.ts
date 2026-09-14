import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AreasService } from '../../core/services/areas.service';
import { ModulosService } from '../../core/services/modulos.service';
import { TurnosService } from '../../core/services/turnos.service';

/**
 * Vista pública para proyectar en el showroom — sin autenticación, ruta
 * aparte y sin el navbar del dashboard. Nunca pinta el nombre del
 * cliente: las reglas de Firestore ya limitan la lectura pública a
 * turnos en_espera/en_atencion, pero el filtro de qué se muestra en
 * pantalla es responsabilidad de este componente.
 */
@Component({
  selector: 'app-sala',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './sala.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sala {
  private readonly turnosService = inject(TurnosService);
  private readonly modulosService = inject(ModulosService);
  private readonly areasService = inject(AreasService);

  private readonly turnos = toSignal(this.turnosService.turnosActivosGlobal(), { initialValue: [] });
  private readonly modulos = toSignal(this.modulosService.listar(), { initialValue: [] });
  private readonly areas = toSignal(this.areasService.listar(), { initialValue: [] });

  readonly enAtencion = computed(() => this.turnos().filter((t) => t.estado === 'en_atencion'));
  readonly enEspera = computed(() => this.turnos().filter((t) => t.estado === 'en_espera').slice(0, 12));

  /** Sin nadie en atención ni en cola, las dos columnas quedan casi vacías — mejor un solo estado de reposo centrado. */
  readonly salaVacia = computed(() => this.enAtencion().length === 0 && this.enEspera().length === 0);

  readonly ahora = signal(new Date());

  constructor() {
    const intervalo = setInterval(() => this.ahora.set(new Date()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  nombreModulo(moduloId: string | null): string {
    if (!moduloId) {
      return '—';
    }
    return this.modulos().find((m) => m.id === moduloId)?.nombre ?? '—';
  }

  nombreArea(areaId: string): string {
    return this.areas().find((a) => a.id === areaId)?.nombre ?? areaId;
  }
}
