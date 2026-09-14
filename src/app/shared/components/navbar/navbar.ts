import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly rol = this.usuarios.rol;

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
