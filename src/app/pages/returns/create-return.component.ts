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
  IonTextarea,
  IonList,
  IonCheckbox,
  IonModal,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowUndo,
  search,
  close,
  checkmark,
  alertCircle,
  cash,
  calendarOutline,
} from 'ionicons/icons';
import { SalesService } from '../../services/sales.service';
import { ReturnsService } from '../../services/returns.service';
import { Sale } from '../../core/interfaces/sale.interfaces';
import { ReturnItem, ReturnReason } from '../../core/interfaces/return.interfaces';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-create-return',
  templateUrl: './create-return.component.html',
  styleUrls: ['./create-return.component.scss'],
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
    IonTextarea,
    IonList,
    IonCheckbox,
    IonModal,
  ],
})
export class CreateReturnComponent implements OnInit {
  sales: Sale[] = [];
  filteredSales: Sale[] = [];
  selectedSale: Sale | null = null;
  searchSaleId = '';
  isLoadingSales = false;
  startDate: string | null = null;
  endDate: string | null = null;
  isLoadingReturn = false;
  returnType: 'full' | 'partial' = 'full';
  returnItems: ReturnItem[] = [];
  returnReason: ReturnReason = 'customer_request';
  returnNotes = '';
  showConfirmModal = false;

  private salesService = inject(SalesService);
  private returnsService = inject(ReturnsService);
  private loadingService = inject(LoadingService);
  private toastController = inject(ToastController);

  returnReasons: { value: ReturnReason; label: string }[] = [
    { value: 'customer_request', label: 'Solicitud del cliente' },
    { value: 'defective', label: 'Producto defectuoso' },
    { value: 'wrong_item', label: 'Producto incorrecto' },
    { value: 'damaged', label: 'Producto dañado' },
    { value: 'other', label: 'Otro' },
  ];

  constructor() {
    addIcons({
      arrowUndo,
      search,
      close,
      checkmark,
      alertCircle,
      cash,
      calendarOutline,
    });
  }

  async ngOnInit() {
    await this.loadRecentSales();
  }

  async loadRecentSales() {
    this.isLoadingSales = true;
    try {
      const result = await this.salesService.getPaginated();
      this.sales = result.sales.filter((s) => s.status === 'completed');
      this.applyFilter();
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      await this.showToast('Error al cargar ventas', 'danger');
    } finally {
      this.isLoadingSales = false;
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

    this.filteredSales = this.sales.filter((s) => {
      let matchesDate = true;
      if (start || end) {
        if (!s.createdAt) {
          matchesDate = false;
        } else {
          const d = (s.createdAt as { toDate?: () => Date }).toDate
            ? (s.createdAt as { toDate: () => Date }).toDate()
            : new Date(s.createdAt as Date | string);
          if (start && d < start) matchesDate = false;
          if (end && d > end) matchesDate = false;
        }
      }
      return matchesDate;
    });
  }

  async searchSale() {
    if (!this.searchSaleId.trim()) {
      await this.showToast('Ingrese un ID de venta', 'warning');
      return;
    }

    this.isLoadingSales = true;
    try {
      const sale = await new Promise<Sale>((resolve, reject) => {
        const sub = this.salesService.getById(this.searchSaleId.trim()).subscribe({
          next: (s) => {
            sub.unsubscribe();
            resolve(s);
          },
          error: (err) => {
            sub.unsubscribe();
            reject(err);
          },
        });
      });

      if (sale.status === 'cancelled') {
        await this.showToast('Esta venta ya está cancelada', 'warning');
        return;
      }

      this.selectedSale = sale;
      this.initializeReturnItems();
    } catch (error) {
      console.error('Error al buscar venta:', error);
      await this.showToast('Venta no encontrada', 'danger');
    } finally {
      this.isLoadingSales = false;
    }
  }

  selectSale(sale: Sale) {
    if (sale.status === 'cancelled') {
      this.showToast('Esta venta ya está cancelada', 'warning');
      return;
    }
    this.selectedSale = sale;
    this.initializeReturnItems();
  }

  initializeReturnItems() {
    if (!this.selectedSale) return;

    if (this.returnType === 'full') {
      // Para devolución completa, todos los ítems están seleccionados
      this.returnItems = this.selectedSale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceUnit: item.priceUnit,
        total: item.total,
        reason: this.returnReason,
      }));
    } else {
      // Para devolución parcial, inicializar con cantidad 0
      this.returnItems = this.selectedSale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        priceUnit: item.priceUnit,
        total: 0,
        reason: this.returnReason,
      }));
    }
  }

  onReturnTypeChange() {
    this.initializeReturnItems();
  }

  updateReturnItemQuantity(index: number, quantity: number) {
    if (!this.selectedSale) return;

    const item = this.returnItems[index];
    const originalItem = this.selectedSale.items[index];

    if (quantity < 0) quantity = 0;
    if (quantity > originalItem.quantity) {
      quantity = originalItem.quantity;
      this.showToast(
        `No se puede devolver más de ${originalItem.quantity} unidades`,
        'warning'
      );
    }

    item.quantity = quantity;
    item.total = quantity * item.priceUnit;
    item.reason = this.returnReason;
  }

  getTotalRefund(): number {
    return this.returnItems.reduce((sum, item) => sum + item.total, 0);
  }

  getSelectedItemsCount(): number {
    return this.returnItems.filter((item) => item.quantity > 0).length;
  }

  canProcessReturn(): boolean {
    if (!this.selectedSale) return false;
    if (this.returnType === 'full') return true;
    return this.getSelectedItemsCount() > 0 && this.getTotalRefund() > 0;
  }

  getReturnReasonLabel(): string {
    const reason = this.returnReasons.find((r) => r.value === this.returnReason);
    return reason ? reason.label : 'No especificada';
  }

  async processReturn() {
    if (!this.selectedSale || !this.canProcessReturn()) return;

    this.showConfirmModal = true;
  }

  async confirmReturn() {
    if (!this.selectedSale) return;

    this.isLoadingReturn = true;
    this.loadingService.show('Procesando devolución...');

    try {
      if (this.returnType === 'full') {
        await this.returnsService.cancelFullSale(
          this.selectedSale.id!,
          this.returnReason,
          this.returnNotes
        );
        await this.showToast('Venta cancelada y stock repuesto', 'success');
      } else {
        const itemsToReturn = this.returnItems.filter((item) => item.quantity > 0);
        await this.returnsService.createPartialReturn(
          this.selectedSale.id!,
          itemsToReturn,
          this.returnReason,
          this.returnNotes
        );
        await this.showToast('Devolución parcial procesada', 'success');
      }

      // Limpiar formulario
      this.selectedSale = null;
      this.searchSaleId = '';
      this.returnType = 'full';
      this.returnItems = [];
      this.returnNotes = '';
      this.showConfirmModal = false;

      // Recargar ventas
      await this.loadRecentSales();
    } catch (error: any) {
      console.error('Error al procesar devolución:', error);
      await this.showToast(
        error.message || 'Error al procesar la devolución',
        'danger'
      );
    } finally {
      this.isLoadingReturn = false;
      this.loadingService.hide();
    }
  }

  cancelReturn() {
    this.showConfirmModal = false;
  }

  clearSelection() {
    this.selectedSale = null;
    this.searchSaleId = '';
    this.returnItems = [];
    this.returnNotes = '';
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
