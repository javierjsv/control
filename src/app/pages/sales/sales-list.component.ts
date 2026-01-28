import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonMenuButton, IonButtons, IonList, IonItem, IonLabel, IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonRefresher, IonRefresherContent, IonInfiniteScroll, IonInfiniteScrollContent, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cash, search } from 'ionicons/icons';
import { SalesService } from '../../services/sales.service';
import { Sale } from '../../core/interfaces/sale.interfaces';
import { LoadingService } from '../../core/services/loading.service';
import { ToastController } from '@ionic/angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  templateUrl: './sales-list.component.html',
  styleUrls: ['./sales-list.component.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonMenuButton,
    IonButtons,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonInput,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    MatPaginatorModule,
  ],
})
export class SalesListComponent implements OnInit, OnDestroy {
  sales: Sale[] = [];
  filteredSales: Sale[] = [];
  paginatedSales: Sale[] = [];

  isLoading = false;
  searchTerm = '';

  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems = 0;

  hasMore = true;
  isLoadingMore = false;
  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

  private salesService = inject(SalesService);
  private loadingService = inject(LoadingService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ cash, search });
  }

  ngOnInit(): void {
    this.loadSales();
  }

  ngOnDestroy(): void {
    // no subscriptions directas por ahora
  }

  async loadSales() {
    this.isLoading = true;
    this.loadingService.show('Cargando ventas...');
    try {
      const result = await this.salesService.getPaginated();
      this.sales = result.sales;
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.updatePaginatedSales();
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      this.showToast('Error al cargar ventas', 'danger');
    } finally {
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  async loadMoreSales(event: any) {
    if (!this.lastDoc || !this.hasMore || this.isLoadingMore || this.searchTerm) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = await this.salesService.loadMore(this.lastDoc);
      this.sales = [...this.sales, ...result.sales];
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.isLoadingMore = false;
      event.target.complete();

      if (!this.hasMore) {
        event.target.disabled = true;
      }
    } catch (error) {
      console.error('Error al cargar más ventas:', error);
      this.showToast('Error al cargar más ventas', 'danger');
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  onSearchChange(event: CustomEvent) {
    this.searchTerm = (event.detail.value as string) || '';
    this.applyFilter();
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredSales = this.sales;
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredSales = this.sales.filter((sale) => {
        const customerName = sale.customerName?.toLowerCase() || '';
        const itemsNames = sale.items.map((i) => i.productName.toLowerCase()).join(' ');
        return customerName.includes(searchLower) || itemsNames.includes(searchLower);
      });
    }
    this.updatePaginatedSales();
  }

  updatePaginatedSales() {
    this.totalItems = this.filteredSales.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedSales = this.filteredSales.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedSales();
  }

  async doRefresh(event: any) {
    try {
      this.pageIndex = 0;
      this.lastDoc = null;
      this.hasMore = true;
      await this.loadSales();
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar ventas:', error);
      this.showToast('Error al actualizar ventas', 'danger');
      event.target.complete();
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value || 0);
  }

  formatDate(value: any): string {
    if (!value) return '';
    const date = (value.toDate ? value.toDate() : value) as Date;
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatItemsSummary(sale: Sale): string {
    if (!sale.items || sale.items.length === 0) return '';
    if (sale.items.length === 1) {
      const item = sale.items[0];
      return `${item.productName} x${item.quantity}`;
    }
    const first = sale.items[0];
    const others = sale.items.length - 1;
    return `${first.productName} x${first.quantity} + ${others} más`;
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

