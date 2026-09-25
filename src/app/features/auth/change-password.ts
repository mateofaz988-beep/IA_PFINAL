import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { apiErrorMessage } from '../../core/utils/api-error.util';

@Component({
  selector: 'app-change-password', standalone: true, imports: [ReactiveFormsModule],
  template: `<main class="min-h-screen bg-spec-paper px-5 py-16 text-asphalt"><section class="mx-auto max-w-md border border-steel/30 p-8">
    <p class="font-data text-xs uppercase tracking-widest">AUTOSCAN MOTORS · TU CUENTA</p><h1 class="font-display text-4xl my-5">Establece tu contraseña</h1>
    <p class="mb-6 text-sm text-steel">Elige una contraseña personal de al menos 12 caracteres para continuar.</p>
    <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
      <label class="block">Contraseña actual<input class="mt-2 block w-full border border-steel/30 bg-white p-3" type="password" formControlName="current" autocomplete="current-password" /></label>
      <label class="block">Nueva contraseña<input class="mt-2 block w-full border border-steel/30 bg-white p-3" type="password" formControlName="password" autocomplete="new-password" /></label>
      <label class="block">Repetir contraseña<input class="mt-2 block w-full border border-steel/30 bg-white p-3" type="password" formControlName="confirm" autocomplete="new-password" /></label>
      @if (error()) { <p role="alert" class="text-rust">{{error()}}</p> }
      <button class="w-full bg-asphalt text-spec-paper p-3 disabled:opacity-50" [disabled]="busy()">{{busy() ? 'Guardando…' : 'Guardar contraseña'}}</button>
    </form></section></main>`
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false); readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({ current: ['', Validators.required], password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]], confirm: ['', Validators.required] });
  async save(): Promise<void> {
    if (this.busy()) return;
    const value = this.form.getRawValue();
    if (this.form.invalid || value.password !== value.confirm) { this.form.markAllAsTouched(); this.error.set('Revisa la longitud y confirma que las contraseñas coincidan.'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.auth.changePassword(value.current, value.password); await this.router.navigateByUrl('/dashboard'); }
    catch (error) { this.error.set(apiErrorMessage(error)); } finally { this.busy.set(false); }
  }
}
