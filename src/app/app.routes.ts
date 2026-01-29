import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
    canActivate: [authGuard],
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/product/productos/productos.component').then((m) => m.ProductosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
    canActivate: [authGuard],
  },
  {
    path: 'customers',
    loadComponent: () => import('./pages/customers/customers.component').then((m) => m.CustomersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ventas-rapidas',
    loadComponent: () => import('./pages/sales/quick-sale.component').then((m) => m.QuickSaleComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ventas-completas',
    loadComponent: () => import('./pages/sales/full-sale.component').then((m) => m.FullSaleComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ventas',
    loadComponent: () => import('./pages/sales/sales-list.component').then((m) => m.SalesListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/categories/categories.component').then((m) => m.CategoriesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'stock-alerts',
    loadComponent: () => import('./pages/stock-alerts/stock-alerts.component').then((m) => m.StockAlertsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
];
