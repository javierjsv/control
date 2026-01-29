import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  IonInput,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  time,
  arrowUndo,
  cash,
  documentText,
  person,
  calendarOutline,
} from 'ionicons/icons';
import { ReturnsService } from '../../services/returns.service';
import { Return, ReturnReason } from '../../core/interfaces/return.interfaces';
import { SalesService } from '../../services/sales.service';
import { Sale } from '../../core/interfaces/sale.interfaces';

@Component({
  selector: 'app-returns-history',
  templateUrl: './returns-history.component.html',
  styleUrls: ['./returns-history.component.scss'],
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
    IonItem,
    IonLabel,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonChip,
    IonInput,
  ],
})
export class ReturnsHistoryComponent implements OnInit {
  returns: Return[] = [];
  filteredReturns: Return[] = [];
  isLoading = false;
  salesMap = new Map<string, Sale>();

  startDate: string | null = null;
  endDate: string | null = null;

  private returnsService = inject(ReturnsService);
  private salesService = inject(SalesService);
  private toastController = inject(ToastController);

  returnReasonLabels: Record<ReturnReason, string> = {
    customer_request: 'Solicitud del cliente',
    defective: 'Producto defectuoso',
    wrong_item: 'Producto incorrecto',
    damaged: 'Producto dañado',
    other: 'Otro',
  };

  constructor() {
    addIcons({
      time,
      arrowUndo,
      cash,
      documentText,
      person,
      calendarOutline,
    });
  }

  async ngOnInit() {
    await this.loadReturns();
  }

  async loadReturns() {
    this.isLoading = true;
    try {
      const result = await this.returnsService.getPaginated();
      this.returns = result.returns;

      // Cargar información de las ventas relacionadas
      await this.loadSalesInfo();
      this.applyFilter();
    } catch (error) {
      console.error('Error al cargar devoluciones:', error);
      await this.showToast('Error al cargar devoluciones', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async onStartDateChange(event: CustomEvent) {
    this.startDate = (event.detail?.value as string) || null;

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (start > end) {
        await this.showToast(
          'La fecha "Desde" no puede ser mayor que la fecha "Hasta"',
          'warning'
        );
        this.startDate = null;
        return;
      }
    }

    this.applyFilter();
  }

  async onEndDateChange(event: CustomEvent) {
    this.endDate = (event.detail?.value as string) || null;

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (start > end) {
        await this.showToast(
          'La fecha "Hasta" no puede ser menor que la fecha "Desde"',
          'warning'
        );
        this.endDate = null;
        return;
      }
    }

    this.applyFilter();
  }

  applyFilter() {
    let start: Date | null = null;
    let end: Date | null = null;

    if (this.startDate) {
      start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
    }
    if (this.endDate) {
      end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
    }

    this.filteredReturns = this.returns.filter((r) => {
      let matchesDate = true;
      if (start || end) {
        if (!r.createdAt) {
          matchesDate = false;
        } else {
          const d = (r.createdAt as { toDate?: () => Date }).toDate
            ? (r.createdAt as { toDate: () => Date }).toDate()
            : new Date(r.createdAt as Date | string);
          if (start && d < start) matchesDate = false;
          if (end && d > end) matchesDate = false;
        }
      }
      return matchesDate;
    });
  }

  async loadSalesInfo() {
    const saleIds = [...new Set(this.returns.map((r) => r.saleId))];
    
    for (const saleId of saleIds) {
      if (!this.salesMap.has(saleId)) {
        try {
          const sale = await new Promise<Sale>((resolve, reject) => {
            const sub = this.salesService.getById(saleId).subscribe({
              next: (s) => {
                sub.unsubscribe();
                resolve(s);
              },
              error: () => {
                sub.unsubscribe();
                resolve(null as any);
              },
            });
          });
          if (sale) {
            this.salesMap.set(saleId, sale);
          }
        } catch (error) {
          console.error(`Error al cargar venta ${saleId}:`, error);
        }
      }
    }
  }

  async handleRefresh(event: any) {
    await this.loadReturns();
    event.target.complete();
  }

  getSale(saleId: string): Sale | undefined {
    return this.salesMap.get(saleId);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(value || 0);
  }

  formatDate(date: Date | any): string {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getReturnReasonLabel(reason?: ReturnReason): string {
    if (!reason) return 'No especificada';
    return this.returnReasonLabels[reason] || reason;
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
