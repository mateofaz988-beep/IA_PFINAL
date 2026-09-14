import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'sala',
    loadComponent: () => import('./features/sala/sala').then((m) => m.Sala),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/authenticated-layout/authenticated-layout').then((m) => m.AuthenticatedLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/home/home').then((m) => m.DashboardHome),
      },
      {
        path: 'asistente',
        loadComponent: () => import('./features/dashboard/assistant/assistant').then((m) => m.Assistant),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['administrador'])],
        loadComponent: () => import('./features/dashboard/admin/admin-shell/admin-shell').then((m) => m.AdminShell),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'areas' },
          {
            path: 'areas',
            loadComponent: () => import('./features/dashboard/admin/areas/areas-admin').then((m) => m.AreasAdmin),
          },
          {
            path: 'modulos',
            loadComponent: () =>
              import('./features/dashboard/admin/modulos/modulos-admin').then((m) => m.ModulosAdmin),
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/dashboard/admin/usuarios/usuarios-admin').then((m) => m.UsuariosAdmin),
          },
          {
            path: 'turnos',
            loadComponent: () =>
              import('./features/dashboard/admin/turnos/turnos-admin').then((m) => m.TurnosAdmin),
          },
          {
            path: 'estadisticas',
            loadComponent: () =>
              import('./features/dashboard/admin/estadisticas/estadisticas-admin').then(
                (m) => m.EstadisticasAdmin,
              ),
          },
          {
            path: 'sembrar',
            loadComponent: () => import('./features/dashboard/admin/seed/seed').then((m) => m.AdminSeed),
          },
        ],
      },
      {
        path: 'turnos/solicitar',
        loadComponent: () =>
          import('./features/dashboard/turnos/solicitar/solicitar').then((m) => m.SolicitarTurno),
      },
      {
        path: 'turnos/historial',
        loadComponent: () =>
          import('./features/dashboard/turnos/historial/historial').then((m) => m.HistorialTurnos),
      },
      {
        path: 'turnos/:id',
        loadComponent: () => import('./features/dashboard/turnos/mi-turno/mi-turno').then((m) => m.MiTurno),
      },
      {
        path: 'asesor',
        canActivate: [roleGuard(['asesor'])],
        loadComponent: () => import('./features/dashboard/asesor/panel/panel').then((m) => m.AsesorPanel),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
