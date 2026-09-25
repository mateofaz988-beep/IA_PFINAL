import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly rol = this.usuarios.rol;
  readonly cargandoSesion = this.auth.isLoading;
  readonly menuAbierto = signal(false);
  readonly errorSesion = signal(false);

  async logout(): Promise<void> {
    this.errorSesion.set(false);
    try {
      await this.auth.logout();
      this.menuAbierto.set(false);
      await this.router.navigateByUrl('/login');
    } catch {
      this.errorSesion.set(true);
    }
  }
}
