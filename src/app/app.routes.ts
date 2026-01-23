import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.component').then((m) => m.PerfilComponent),
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos/productos.component').then((m) => m.ProductosComponent),
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./product/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
];
