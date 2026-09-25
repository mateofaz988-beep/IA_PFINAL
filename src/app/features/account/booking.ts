import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { ApiService } from '../../core/services/api.service';
import { VehicleApi } from '../../core/models/vehicle-api.model';
import { apiErrorMessage } from '../../core/utils/api-error.util';

@Component({selector: 'app-booking', standalone: true, imports: [Navbar, FormsModule, RouterLink], styleUrl: '../../shared/commerce.css',
  template: `<app-navbar/><main class="page"><p class="eyebrow">Conoce tu próximo vehículo</p><h1>Agendar visita</h1>
    @if (loading()) { <p role="status">Consultando vehículo y horario…</p> }
    @if (error()) { <p role="alert" class="error">{{error()}}</p> }
    @if (success()) { <div class="success" role="status">Tu visita quedó agendada. Nuestro equipo asignará un vendedor.</div><a class="button" routerLink="/mis-turnos">Ver mis turnos</a> }
    @else if (vehicle(); as v) { <section class="panel"><h2>{{v.marca}} {{v.modelo}} · {{v.anio}}</h2><p class="muted">Horarios en Ecuador. Duración: {{duration()}} minutos.</p>
      <form (ngSubmit)="submit()"><div class="fields"><label>Fecha<input type="date" name="date" [(ngModel)]="date" [min]="today" (ngModelChange)="loadSlots()" required /></label>
      <label>Hora disponible<select name="slot" [(ngModel)]="slot" [disabled]="loadingSlots()" required><option value="">Selecciona un horario</option>@for (time of slots(); track time) { <option [value]="time">{{time.slice(11,16)}}</option> }</select></label>
      <label class="span-2">Notas para la visita<textarea name="notes" [(ngModel)]="notes" maxlength="2000" rows="3"></textarea></label></div>
      @if (loadingSlots()) { <p role="status">Consultando disponibilidad…</p> } @else if (date && !slots().length) { <p class="muted">No hay horarios disponibles en esta fecha.</p> }
      <div class="actions"><button [disabled]="busy() || loadingSlots() || !slot">{{busy() ? 'Agendando…' : 'Confirmar visita'}}</button><a routerLink="/catalogo">Volver al catálogo</a></div></form></section> }</main>`})
export class Booking {
  private readonly api = inject(ApiService); private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly vehicle = signal<VehicleApi | null>(null); readonly loading = signal(true); readonly loadingSlots = signal(false); readonly busy = signal(false);
  readonly error = signal(''); readonly success = signal(false); readonly slots = signal<string[]>([]); readonly duration = signal(0);
  readonly today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Guayaquil'}).format(new Date());
  date = ''; slot = ''; notes = ''; private generation = 0;
  constructor() { void this.load(); }
  private async load(): Promise<void> { try { const [v, config] = await Promise.all([this.api.get<VehicleApi>(`/vehiculos/${this.id}`), this.api.get<{duracion_turno_minutos: number}>('/turnos/configuracion')]); this.vehicle.set(v); this.duration.set(config.duracion_turno_minutos); } catch(e) {this.error.set(apiErrorMessage(e));} finally {this.loading.set(false);} }
  async loadSlots(): Promise<void> { const current = ++this.generation; this.slot = ''; this.slots.set([]); if (!this.date) return; this.loadingSlots.set(true); try { const slots = await this.api.get<string[]>(`/turnos/disponibilidad?vehiculo_id=${this.id}&fecha=${encodeURIComponent(this.date)}`); if (current === this.generation) this.slots.set(slots); } catch(e) {this.error.set(apiErrorMessage(e));} finally {if(current === this.generation)this.loadingSlots.set(false);} }
  async submit(): Promise<void> { if (this.busy() || !this.slot) return; this.busy.set(true); this.error.set(''); try {await this.api.post('/turnos', {vehiculo_id: Number(this.id), fecha_inicio: this.slot, notas_cliente: this.notes}); this.success.set(true);} catch(e) {this.error.set(apiErrorMessage(e)); await this.loadSlots();} finally {this.busy.set(false);} }
}
