import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { print, logoWhatsapp, mail, close } from 'ionicons/icons';
import { take } from 'rxjs';
import { SalesService } from '../../services/sales.service';
import { Sale } from '../../core/interfaces/sale.interfaces';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonButtons,
  ],
})
export class ReceiptComponent implements OnChanges {
  @Input() saleId: string | null = null;
  @Input() customerPhone: string | null = null;
  @Input() customerEmail: string | null = null;
  @Output() closed = new EventEmitter<void>();

  sale = signal<Sale | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  logoPath = 'assets/icon/store.png';
  businessName = 'Mi Negocio';

  private salesService = inject(SalesService);

  constructor() {
    addIcons({ print, logoWhatsapp, mail, close });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const id = changes['saleId'];
    if (id && this.saleId) {
      this.loadSale();
    } else if (id && !this.saleId) {
      this.sale.set(null);
      this.loading.set(false);
      this.error.set(null);
    }
  }

  loadSale(): void {
    if (!this.saleId) return;
    this.loading.set(true);
    this.error.set(null);
    this.salesService
      .getById(this.saleId)
      .pipe(take(1))
      .subscribe({
        next: (s) => {
          this.sale.set(s);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la venta');
          this.loading.set(false);
        },
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value ?? 0);
  }

  formatDate(v: Date | any): string {
    if (!v) return '-';
    const d = (v && typeof v.toDate === 'function') ? v.toDate() : new Date(v);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  paymentLabel(method: string): string {
    return PAYMENT_LABELS[method] ?? method;
  }

  printReceipt(): void {
    const t = document.title;
    document.title = `Recibo ${this.saleId || ''}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = t; }, 300);
    }, 100);
  }

  shareWhatsApp(): void {
    const s = this.sale();
    if (!s) return;
    const text = this.buildReceiptText(s);
    let phone = (this.customerPhone || '').replace(/\D/g, '');
    if (phone.length === 10 && !phone.startsWith('57')) {
      phone = '57' + phone;
    }
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  shareEmail(): void {
    const s = this.sale();
    if (!s) return;
    const subj = `Recibo de venta #${(this.saleId || '').slice(0, 8)}`;
    const body = this.buildReceiptText(s);
    const to = this.customerEmail ? `mailto:${this.customerEmail}?` : 'mailto:?';
    const url = `${to}subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  private buildReceiptText(s: Sale): string {
    const lines: string[] = [
      `${this.businessName}`,
      '─────────────────────────',
      `Recibo de venta #${(this.saleId || '').slice(0, 8)}`,
      `Fecha: ${this.formatDate(s.createdAt)}`,
      `Cliente: ${s.customerName || 'No especificado'}`,
      '',
      'Productos:',
    ];
    (s.items || []).forEach((i) => {
      lines.push(`• ${i.productName} x${i.quantity} ${this.formatCurrency(i.total)}`);
    });
    lines.push('');
    if ((s.subtotal ?? 0) !== (s.total ?? 0) && (s.discount ?? 0) > 0) {
      lines.push(`Subtotal: ${this.formatCurrency(s.subtotal ?? 0)}`);
      lines.push(`Descuento: -${this.formatCurrency(s.discount ?? 0)}`);
    }
    lines.push(`Total: ${this.formatCurrency(s.total ?? 0)}`);
    lines.push(`Pago: ${this.paymentLabel(s.paymentMethod || 'other')}`);
    return lines.join('\n');
  }

  close(): void {
    this.closed.emit();
  }
}
