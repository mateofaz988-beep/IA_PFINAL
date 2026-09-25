import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { ApiService } from '../../core/services/api.service';
import { VehicleApi, imageUrl } from '../../core/models/vehicle-api.model';
import { apiErrorMessage } from '../../core/utils/api-error.util';

@Component({ selector: 'app-favorites', standalone: true, imports: [Navbar, RouterLink, CurrencyPipe], styleUrl: '../../shared/commerce.css',
  template: `<app-navbar/><main class="page"><p class="eyebrow">Tu selección</p><h1>Mis favoritos</h1>
    @if (loading()) { <p role="status">Cargando favoritos…</p> }
    @if (error()) { <p class="error" role="alert">{{error()}}</p><button (click)="load()">Reintentar</button> }
    @if (!loading() && !error() && !items().length) { <p class="panel">Tu selección está vacía. Guarda los vehículos que más te interesen.</p> }
    <div class="grid">@for (v of items(); track v.id) { <article class="panel"><img class="car-image" [src]="image(v.imagen_principal)" [alt]="v.marca + ' ' + v.modelo"/>
      <p class="eyebrow">{{v.anio}} · {{v.estado}}</p><h2>{{v.marca}} {{v.modelo}}</h2><p class="price">{{v.precio | currency:'USD':'symbol':'1.0-0'}}</p>
      <div class="actions"><a class="button" [routerLink]="['/catalogo', v.id]">Ver vehículo</a><button class="secondary" [disabled]="busy()" (click)="remove(v.id)">Quitar</button></div></article> }
    </div><a class="button secondary" routerLink="/catalogo">Explorar catálogo</a></main>` })
export class Favorites {
  private readonly api = inject(ApiService);
  readonly items = signal<VehicleApi[]>([]); readonly loading = signal(true); readonly busy = signal(false); readonly error = signal(''); readonly image = imageUrl;
  constructor() { void this.load(); }
  async load(): Promise<void> { this.loading.set(true); this.error.set(''); try { this.items.set(await this.api.get<VehicleApi[]>('/favoritos')); } catch (e) { this.error.set(apiErrorMessage(e)); } finally { this.loading.set(false); } }
  async remove(id: number): Promise<void> { this.busy.set(true); try { await this.api.delete(`/favoritos/${id}`); this.items.update(items => items.filter(v => v.id !== id)); } catch (e) { this.error.set(apiErrorMessage(e)); } finally { this.busy.set(false); } }
}
