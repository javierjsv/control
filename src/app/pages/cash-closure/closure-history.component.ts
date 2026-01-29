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
  IonInput,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, documentText, cash, time } from 'ionicons/icons';
import { CashClosureService } from '../../services/cash-closure.service';
import { CashClosure, PAYMENT_METHOD_LABELS } from '../../core/interfaces/cash-closure.interfaces';

@Component({
  selector: 'app-closure-history',
  templateUrl: './closure-history.component.html',
  styleUrls: ['./closure-history.component.scss'],
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
    IonInput,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonIcon,
  ],
})
export class ClosureHistoryComponent implements OnInit {
  closures: CashClosure[] = [];
  filteredClosures: CashClosure[] = [];
  isLoading = false;
  startDate: string | null = null;
  endDate: string | null = null;

  private cashClosureService = inject(CashClosureService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ calendarOutline, documentText, cash, time });
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.isLoading = true;
    try {
      this.closures = await this.cashClosureService.getAll();
      this.applyFilter();
    } catch (e) {
      console.error(e);
      await this.showToast('Error al cargar historial de cortes', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async handleRefresh(event: any) {
    await this.load();
    event.target.complete();
  }

  async onStartDateChange(e: CustomEvent) {
    this.startDate = (e.detail?.value as string) || null;
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (start > end) {
        await this.showToast('La fecha "Desde" no puede ser mayor que "Hasta"', 'warning');
        this.startDate = null;
        return;
      }
    }
    this.applyFilter();
  }

  async onEndDateChange(e: CustomEvent) {
    this.endDate = (e.detail?.value as string) || null;
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (start > end) {
        await this.showToast('La fecha "Hasta" no puede ser menor que "Desde"', 'warning');
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
    this.filteredClosures = this.closures.filter((c) => {
      const d = c.closureDate;
      if (!d) return false;
      if (start && d < start.toISOString().slice(0, 10)) return false;
      if (end && d > end.toISOString().slice(0, 10)) return false;
      return true;
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value ?? 0);
  }

  formatDate(str: string): string {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  getMethodLabel(method: string): string {
    return PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] ?? method;
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const t = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
  }
}
