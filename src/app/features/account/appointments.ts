import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error.util';

export interface Appointment { id: number; vehiculo_id: number; cliente_id: number; vendedor_id?: number; fecha_inicio: string; fecha_fin: string; estado: string; vehiculo: string; cliente: string; vendedor?: string; notas_cliente?: string; notas_internas?: string; }
@Component({selector: 'app-appointments', standalone: true, imports: [Navbar, FormsModule, RouterLink, DatePipe], styleUrl: '../../shared/commerce.css',
  template: `@if (standalonePage) {<app-navbar/>}<main class="page"><p class="eyebrow">Agenda AutoScan</p><h1>{{role() === 'cliente' ? 'Mis turnos' : 'Agenda de visitas'}}</h1>
    <div class="actions"><button class="secondary" (click)="load()" [disabled]="loading()">Actualizar</button>@if (role() === 'cliente') {<a routerLink="/catalogo" class="button">Agendar desde el catálogo</a>}</div>
    @if (loading()) {<p role="status">Cargando agenda…</p>} @if(error()) {<p role="alert" class="error">{{error()}}</p>} @if(message()) {<p role="status" class="success">{{message()}}</p>}
    @if(!loading() && !error() && !rows().length) {<p class="panel">No hay turnos para mostrar.</p>}
    @for (t of rows(); track t.id) {<article class="panel"><p class="eyebrow">{{t.estado}} · {{t.fecha_inicio | date:'dd/MM/yyyy HH:mm'}}</p><h2>{{t.vehiculo}}</h2>
      <p>Cliente: {{t.cliente}}</p><p class="muted">Vendedor: {{t.vendedor || 'Por asignar'}} · Finaliza {{t.fecha_fin | date:'HH:mm'}}</p><p>{{t.notas_cliente}}</p>
      @if (t.estado === 'pendiente' || t.estado === 'confirmado') {
        @if(role() === 'cliente') {<div class="actions"><button class="secondary" [disabled]="busy()" (click)="change(t, 'cancelado')">Cancelar visita</button></div>}
        @else {<div class="fields">@if(role() === 'admin' || role() === 'gerente') {<label>Asignar vendedor<select [(ngModel)]="t.vendedor_id"><option [ngValue]="null">Sin asignar</option>@for(s of sellers(); track s.id) {<option [ngValue]="s.id">{{s.nombre}} {{s.apellido}}</option>}</select></label>}
          <label>Notas internas<textarea [(ngModel)]="t.notas_internas" maxlength="4000" rows="2"></textarea></label></div>
          <div class="actions"><button [disabled]="busy()" (click)="change(t, 'confirmado')">Confirmar / guardar</button><button class="secondary" [disabled]="busy()" (click)="change(t, 'atendido')">Atendido</button><button class="secondary" [disabled]="busy()" (click)="change(t, 'no_asistio')">No asistió</button><button class="secondary" [disabled]="busy()" (click)="change(t, 'cancelado')">Cancelar</button></div>}
      } @else if (role() !== 'cliente') {<p class="muted">{{t.notas_internas}}</p>}
    </article>}</main>`})
export class Appointments {
  private readonly api = inject(ApiService); private readonly auth = inject(AuthService);
  readonly standalonePage = !inject(Router).url.startsWith('/dashboard');
  readonly role = () => this.auth.currentUser()?.rol;
  readonly rows = signal<Appointment[]>([]); readonly sellers = signal<{id:number;nombre:string;apellido:string}[]>([]);
  readonly loading = signal(true); readonly busy = signal(false); readonly error = signal(''); readonly message = signal('');
  constructor() {void this.load();}
  async load(): Promise<void> {this.loading.set(true);this.error.set('');try {this.rows.set(await this.api.get<Appointment[]>('/turnos')); if(this.role() === 'admin' || this.role() === 'gerente') this.sellers.set(await this.api.get('/turnos/vendedores'));}catch(e){this.error.set(apiErrorMessage(e));}finally{this.loading.set(false);}}
  async change(t: Appointment, estado: string): Promise<void> {if(this.busy())return;this.busy.set(true);this.error.set('');this.message.set('');const body: Record<string, unknown> = {estado}; if(this.role() !== 'cliente') body['notas_internas'] = t.notas_internas ?? ''; if(this.role() === 'admin' || this.role() === 'gerente') body['vendedor_id'] = t.vendedor_id ?? null; try {await this.api.patch(`/turnos/${t.id}`, body);this.message.set('Turno actualizado.');await this.load();}catch(e){this.error.set(apiErrorMessage(e));}finally{this.busy.set(false);}}
}
