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
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonBadge,
  IonChip,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  time,
  arrowUndo,
  cash,
  documentText,
  person,
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
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonChip,
  ],
})
export class ReturnsHistoryComponent implements OnInit {
  returns: Return[] = [];
  isLoading = false;
  salesMap = new Map<string, Sale>();

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
    } catch (error) {
      console.error('Error al cargar devoluciones:', error);
      await this.showToast('Error al cargar devoluciones', 'danger');
    } finally {
      this.isLoading = false;
    }
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
