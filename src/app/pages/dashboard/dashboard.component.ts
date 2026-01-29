import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonMenuButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cash, trendingUp, alertCircle, barChart, arrowForward, addCircle } from 'ionicons/icons';
import { SalesService } from '../../services/sales.service';
import { ProductsService } from '../../services/products.service';
import { LoadingService } from '../../core/services/loading.service';
import { DashboardStats } from '../../core/interfaces/dashboard.interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonMenuButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonButton,
    IonIcon,
  ],
})
export class DashboardComponent implements OnInit {
  dashboardStats: DashboardStats | null = null;
  isLoadingStats = false;

  private router = inject(Router);
  private salesService = inject(SalesService);
  private productsService = inject(ProductsService);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ cash, trendingUp, alertCircle, barChart, arrowForward, addCircle });
  }

  async ngOnInit() {
    await this.loadDashboardStats();
  }

  async loadDashboardStats() {
    this.isLoadingStats = true;
    this.loadingService.show('Cargando estadísticas...');
    try {
      const stats = await this.salesService.getDashboardStats();
      // Obtener productos con stock bajo
      const lowStockProducts = await this.productsService.getLowStockProducts(10);
      stats.lowStockProducts = lowStockProducts;
      this.dashboardStats = stats;
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.isLoadingStats = false;
      this.loadingService.hide();
    }
  }

  async doRefresh(event: any) {
    try {
      await this.loadDashboardStats();
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar estadísticas:', error);
      event.target.complete();
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value || 0);
  }

  getBarHeight(value: number, allValues: { total: number }[]): number {
    if (!allValues || allValues.length === 0) return 0;
    const maxValue = Math.max(...allValues.map((v) => v.total));
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  goToSales() {
    this.router.navigate(['/ventas']);
  }

  goToFullSale() {
    this.router.navigate(['/ventas-completas']);
  }

  goToProducts() {
    this.router.navigate(['/productos']);
  }
}
