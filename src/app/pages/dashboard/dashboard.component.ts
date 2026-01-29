import { Component, OnInit, inject, ViewChild } from '@angular/core';
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
import { cash, trendingUp, alertCircle, barChart, arrowForward, addCircle, receipt, star, warning } from 'ionicons/icons';
import { SalesService } from '../../services/sales.service';
import { ProductsService } from '../../services/products.service';
import { LoadingService } from '../../core/services/loading.service';
import { DashboardStats } from '../../core/interfaces/dashboard.interfaces';
import { Product } from '../../core/interfaces/product.interfaces';
import { firstValueFrom } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexLegend,
  ApexStroke,
  ApexPlotOptions,
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
  colors: string[];
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgApexchartsModule,
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
  @ViewChild('chart') chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions> = {};

  dashboardStats: DashboardStats | null = null;
  isLoadingStats = false;
  selectedPeriod: 'today' | '7days' | '30days' = '7days';
  topProductsWithImages: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    image: string;
    priceSale: number;
  }> = [];
  lowStockProductsWithImages: Array<{
    id: string;
    name: string;
    quantity: number;
    category: string;
    image: string;
  }> = [];

  private router = inject(Router);
  private salesService = inject(SalesService);
  private productsService = inject(ProductsService);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ cash, trendingUp, alertCircle, barChart, arrowForward, addCircle, receipt, star, warning });
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

      // Obtener información completa de productos para top productos
      const allProducts = await firstValueFrom(this.productsService.getAll());
      this.topProductsWithImages = stats.topProducts.map((tp) => {
        const product = allProducts.find((p) => p.id === tp.productId);
        return {
          ...tp,
          image: product?.image || '',
          priceSale: product?.priceSale || 0,
        };
      });

      // Obtener información completa de productos para stock bajo
      this.lowStockProductsWithImages = lowStockProducts.map((lp) => {
        const product = allProducts.find((p) => p.id === lp.id);
        return {
          ...lp,
          image: product?.image || '',
        };
      });

      // Configurar gráfico
      this.setupChart();
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      this.isLoadingStats = false;
      this.loadingService.hide();
    }
  }

  setupChart() {
    if (!this.dashboardStats || !this.dashboardStats.last7DaysSales.length) return;

    const salesData = this.dashboardStats.last7DaysSales;
    const salesValues = salesData.map((d) => d.total);
    const dates = salesData.map((d) => d.date);

    // Calcular porcentajes de cambio
    const percentages: (number | null)[] = [];
    for (let i = 0; i < salesValues.length; i++) {
      if (i === 0) {
        percentages.push(null);
      } else {
        const prevValue = salesValues[i - 1];
        const currentValue = salesValues[i];
        if (prevValue === 0) {
          percentages.push(currentValue > 0 ? 100 : null);
        } else {
          const change = ((currentValue - prevValue) / prevValue) * 100;
          percentages.push(Math.round(change));
        }
      }
    }

    this.chartOptions = {
      series: [
        {
          name: 'Ventas',
          type: 'column',
          data: salesValues,
        },
        {
          name: 'Cambio %',
          type: 'line',
          data: percentages,
        },
      ],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: false,
        },
        fontFamily: 'inherit',
      },
      colors: ['#4CAF50', '#f44336'],
      stroke: {
        width: [0, 3],
        curve: 'smooth',
      },
      plotOptions: {
        bar: {
          columnWidth: '60%',
          borderRadius: 8,
          colors: {
            ranges: [
              {
                from: 0,
                to: 1000000,
                color: '#4CAF50',
              },
            ],
          },
        },
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [1],
        formatter: (val: string | number | number[], opts?: any) => {
          if (typeof val === 'number') {
            if (val === null) return '';
            return val > 0 ? `+${val}%` : `${val}%`;
          }
          return '';
        },
        style: {
          fontSize: '12px',
          fontWeight: 600,
          colors: ['#f44336'],
        },
        offsetY: -10,
      },
      xaxis: {
        categories: dates,
        labels: {
          style: {
            fontSize: '11px',
            colors: '#666',
          },
          rotate: -45,
          rotateAlways: true,
        },
      },
      yaxis: [
        {
          title: {
            text: 'Ventas ($)',
            style: {
              color: '#666',
              fontSize: '12px',
            },
          },
          labels: {
            formatter: (val: number) => {
              if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
              if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
              return `$${val}`;
            },
            style: {
              colors: '#666',
              fontSize: '11px',
            },
          },
        },
        {
          opposite: true,
          title: {
            text: 'Cambio %',
            style: {
              color: '#f44336',
              fontSize: '12px',
            },
          },
          labels: {
            formatter: (val: number) => {
              if (val === null || val === undefined) return '';
              return val > 0 ? `+${val}%` : `${val}%`;
            },
            style: {
              colors: '#f44336',
              fontSize: '11px',
            },
          },
        },
      ] as ApexYAxis[],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number, opts: any) => {
            if (opts.seriesIndex === 0) {
              return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
              }).format(val);
            }
            return val > 0 ? `+${val}%` : `${val}%`;
          },
        },
      },
      legend: {
        show: false,
      },
    };
  }

  selectPeriod(period: 'today' | '7days' | '30days') {
    this.selectedPeriod = period;
    // Recargar estadísticas con el período seleccionado
    this.loadDashboardStats();
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
