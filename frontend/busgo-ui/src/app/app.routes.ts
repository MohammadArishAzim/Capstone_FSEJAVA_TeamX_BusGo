import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search-results/search-results').then((m) => m.SearchResultsComponent),
  },
  {
    path: 'seats/:id',
    loadComponent: () =>
      import('./features/seat-selection/seat-selection').then((m) => m.SeatSelectionComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'my-trips',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-trips/my-trips').then((m) => m.MyTripsComponent),
  },
  {
    path: 'my-trips/:id/ticket',
    canActivate: [authGuard],
    loadComponent: () => import('./features/ticket/ticket').then((m) => m.TicketComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'buses', pathMatch: 'full' },
      {
        path: 'buses',
        loadComponent: () =>
          import('./features/admin/bus-list/bus-list').then((m) => m.BusListComponent),
      },
      {
        path: 'schedules',
        loadComponent: () =>
          import('./features/admin/schedule-list/schedule-list').then((m) => m.ScheduleListComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
