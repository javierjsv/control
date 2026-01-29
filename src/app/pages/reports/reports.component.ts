import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonToggle,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { documentText, download, print, calendar, trendingUp, people, cash } from 'ionicons/icons';
import { ReportsService } from '../../services/reports.service';
import {
  ReportPeriod,
  FullReport,
  ReportFilters,
} from '../../core/interfaces/report.interfaces';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonToggle,
  ],
})
export class ReportsComponent implements OnInit {
  report: FullReport | null = null;
  isLoading = false;
  selectedPeriod: ReportPeriod = 'week';
  customStartDate = '';
  customEndDate = '';
  useCustomRange = false;
  currentDate = new Date();

  private reportsService = inject(ReportsService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ documentText, download, print, calendar, trendingUp, people, cash });
  }

  async ngOnInit() {
    await this.applyPeriodAndLoad();
  }

  async applyPeriodAndLoad() {
    const { startDate, endDate } = this.reportsService.getDateRangeForPeriod(this.selectedPeriod);
    if (!this.useCustomRange) {
      this.customStartDate = this.formatDateInput(startDate);
      this.customEndDate = this.formatDateInput(endDate);
    }
    await this.loadReport();
  }

  async loadReport() {
    this.isLoading = true;
    try {
      const startDate = this.useCustomRange && this.customStartDate
        ? new Date(this.customStartDate)
        : new Date(this.reportsService.getDateRangeForPeriod(this.selectedPeriod).startDate);
      const endDate = this.useCustomRange && this.customEndDate
        ? new Date(this.customEndDate)
        : new Date(this.reportsService.getDateRangeForPeriod(this.selectedPeriod).endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (startDate > endDate) {
        await this.showToast('La fecha de inicio no puede ser mayor que la fecha de fin', 'warning');
        this.isLoading = false;
        return;
      }

      const filters: ReportFilters = {
        period: this.selectedPeriod,
        startDate,
        endDate,
      };
      this.report = await this.reportsService.getFullReport(filters);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      await this.showToast('Error al generar el reporte', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  formatDateInput(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value || 0);
  }

  async exportToExcel() {
    if (!this.report) return;
    try {
      const wb = XLSX.utils.book_new();
      const fecha = new Date().toISOString().split('T')[0];

      // Hoja Resumen
      const summaryData = [
        ['Resumen del reporte'],
        ['Período', `${this.formatDateInput(this.report.filters.startDate)} - ${this.formatDateInput(this.report.filters.endDate)}`],
        ['Total ventas', this.report.summary.totalSales],
        ['Cantidad de ventas', this.report.summary.totalSalesCount],
        ['Ticket promedio', this.report.summary.averageTicket],
      ];
      if (this.report.incomeVsExpenses) {
        summaryData.push(['Ingresos', this.report.incomeVsExpenses.income]);
        summaryData.push(['Gastos', this.report.incomeVsExpenses.expenses]);
        summaryData.push(['Utilidad', this.report.incomeVsExpenses.profit]);
        summaryData.push(['Margen %', this.report.incomeVsExpenses.profitMargin.toFixed(1) + '%']);
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen');

      // Hoja Ventas por período
      const salesByPeriodData = [
        ['Fecha', 'Etiqueta', 'Total', 'Cantidad'],
        ...this.report.salesByPeriod.map((s) => [s.date, s.label, s.total, s.count]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesByPeriodData), 'Ventas por período');

      // Hoja Top productos
      const topProductsData = [
        ['Producto', 'Unidades vendidas', 'Ingresos'],
        ...this.report.topProducts.map((p) => [p.productName, p.totalSold, p.totalRevenue]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topProductsData), 'Top productos');

      // Hoja Clientes frecuentes
      const customersData = [
        ['Cliente', 'Compras', 'Total gastado', 'Última compra'],
        ...this.report.frequentCustomers.map((c) => [
          c.customerName,
          c.totalPurchases,
          c.totalSpent,
          c.lastPurchaseDate || '',
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(customersData), 'Clientes frecuentes');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${fecha}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await this.showToast('Reporte exportado a Excel correctamente', 'success');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      await this.showToast('Error al exportar a Excel', 'danger');
    }
  }

  printReport() {
    if (!this.report) return;
    
    // Agregar título al documento para impresión
    const originalTitle = document.title;
    const startDate = this.formatDateInput(this.report.filters.startDate);
    const endDate = this.formatDateInput(this.report.filters.endDate);
    document.title = `Reporte de Ventas - ${startDate} a ${endDate}`;
    
    // Esperar un momento para que el título se actualice
    setTimeout(() => {
      window.print();
      // Restaurar título original después de imprimir
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 100);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
