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
  IonTextarea,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cash, card, arrowRedo, documentText, checkmarkCircle, calendar } from 'ionicons/icons';
import { CashClosureService } from '../../services/cash-closure.service';
import {
  SalesSummaryForDay,
  PaymentMethodType,
  CashClosure,
  PAYMENT_METHOD_LABELS,
} from '../../core/interfaces/cash-closure.interfaces';

@Component({
  selector: 'app-close-daily',
  templateUrl: './close-daily.component.html',
  styleUrls: ['./close-daily.component.scss'],
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
    IonTextarea,
  ],
})
export class CloseDailyComponent implements OnInit {
  selectedDate = '';
  salesSummary: SalesSummaryForDay | null = null;
  isLoading = false;
  isSaving = false;
  alreadyClosed = false;

  declaredCash = 0;
  declaredCard = 0;
  declaredTransfer = 0;
  declaredOther = 0;
  notes = '';

  private cashClosureService = inject(CashClosureService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ cash, card, arrowRedo, documentText, checkmarkCircle, calendar });
  }

  ngOnInit() {
    this.setDefaultDate();
    this.load();
  }

  setDefaultDate() {
    const t = new Date();
    this.selectedDate = t.toISOString().slice(0, 10);
  }

  async onDateInput(e: CustomEvent) {
    const v = (e.detail?.value as string) || '';
    if (v) {
      this.selectedDate = v;
      await this.load();
    }
  }

  async load() {
    if (!this.selectedDate) return;
    this.isLoading = true;
    this.declaredCash = 0;
    this.declaredCard = 0;
    this.declaredTransfer = 0;
    this.declaredOther = 0;
    this.notes = '';
    try {
      const date = new Date(this.selectedDate + 'T12:00:00');
      this.salesSummary = await this.cashClosureService.getSalesSummaryForDate(date);
      this.alreadyClosed = await this.cashClosureService.hasClosureForDate(date);
      if (this.salesSummary && !this.alreadyClosed) {
        this.declaredCash = this.salesSummary.byMethod.find((m) => m.method === 'cash')?.total ?? 0;
        this.declaredCard = this.salesSummary.byMethod.find((m) => m.method === 'card')?.total ?? 0;
        this.declaredTransfer = this.salesSummary.byMethod.find((m) => m.method === 'transfer')?.total ?? 0;
        this.declaredOther = this.salesSummary.byMethod.find((m) => m.method === 'other')?.total ?? 0;
      }
    } catch (e) {
      console.error(e);
      await this.showToast('Error al cargar resumen de ventas', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  get totalDeclared(): number {
    return this.declaredCash + this.declaredCard + this.declaredTransfer + this.declaredOther;
  }

  get difference(): number {
    if (!this.salesSummary) return 0;
    return this.totalDeclared - this.salesSummary.total;
  }

  getMethodSummary(method: PaymentMethodType): { total: number; count: number } {
    if (!this.salesSummary) return { total: 0, count: 0 };
    const m = this.salesSummary.byMethod.find((x) => x.method === method);
    return m ? { total: m.total, count: m.count } : { total: 0, count: 0 };
  }

  getDeclared(method: PaymentMethodType): number {
    switch (method) {
      case 'cash': return this.declaredCash;
      case 'card': return this.declaredCard;
      case 'transfer': return this.declaredTransfer;
      case 'other': return this.declaredOther;
      default: return 0;
    }
  }

  onDeclaredChange(method: PaymentMethodType, e: CustomEvent): void {
    const v = e.detail?.value != null ? +(e.detail.value as string) : 0;
    const val = isNaN(v) ? 0 : Math.max(0, v);
    switch (method) {
      case 'cash': this.declaredCash = val; break;
      case 'card': this.declaredCard = val; break;
      case 'transfer': this.declaredTransfer = val; break;
      case 'other': this.declaredOther = val; break;
    }
  }

  getDiff(method: PaymentMethodType): number {
    const decl = this.getDeclared(method);
    const sales = this.getMethodSummary(method).total;
    return decl - sales;
  }

  getMethodLabel(method: PaymentMethodType): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  canClose(): boolean {
    if (!this.salesSummary || this.alreadyClosed) return false;
    return this.totalDeclared >= 0;
  }

  async closeBox() {
    if (!this.canClose() || !this.salesSummary) return;
    this.isSaving = true;
    try {
      const salesByMethod = this.salesSummary.byMethod.map((m) => ({
        method: m.method,
        total: m.total,
        count: m.count,
      }));
      const closure: Omit<CashClosure, 'id'> = {
        closureDate: this.selectedDate,
        closedAt: new Date(),
        salesTotal: this.salesSummary.total,
        salesCount: this.salesSummary.count,
        salesByMethod,
        declaredCash: this.declaredCash,
        declaredCard: this.declaredCard,
        declaredTransfer: this.declaredTransfer,
        declaredOther: this.declaredOther,
        totalDeclared: this.totalDeclared,
        difference: this.difference,
        notes: this.notes.trim() || undefined,
      };
      await this.cashClosureService.createClosure(closure);
      await this.showToast('Corte de caja registrado correctamente', 'success');
      await this.load();
    } catch (e) {
      console.error(e);
      await this.showToast('Error al registrar el corte de caja', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value ?? 0);
  }

  formatDate(str: string): string {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const t = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
  }
}
