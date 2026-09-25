import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-catalogo-shell',
  imports: [Navbar, RouterOutlet],
  template: '<app-navbar /><router-outlet />',
})
export class CatalogoShell {}
