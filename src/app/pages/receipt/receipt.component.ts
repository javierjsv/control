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
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { print, logoWhatsapp, mail, close, download } from 'ionicons/icons';
import { take } from 'rxjs';
import html2canvas from 'html2canvas';
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
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  constructor() {
    addIcons({ print, logoWhatsapp, mail, close, download });
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

  /** Captura el recibo como imagen usando html2canvas */
  private async captureReceiptAsImage(): Promise<Blob | null> {
    const el = document.getElementById('receipt-content');
    if (!el) return null;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          'image/png',
          1
        );
      });
    } catch (e) {
      console.error('Error al capturar recibo:', e);
      return null;
    }
  }

  async shareWhatsApp(): Promise<void> {
    const s = this.sale();
    if (!s) return;
    let phone = this.normalizePhone(this.customerPhone || '');
    if (phone) {
      this.openWhatsApp(phone, s);
    } else {
      const entered = await this.promptPhoneForWhatsApp();
      if (entered) {
        this.openWhatsApp(entered, s);
      } else {
        await this.showToast('Número de WhatsApp requerido', 'warning');
      }
    }
  }

  private normalizePhone(raw: string): string {
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 10 && !digits.startsWith('57')) {
      digits = '57' + digits;
    }
    return digits;
  }

  private async promptPhoneForWhatsApp(): Promise<string | null> {
    return new Promise((resolve) => {
      this.alertController.create({
        header: 'Número de WhatsApp',
        message: 'Ingrese el número al que desea enviar el recibo (10 dígitos o con indicativo 57).',
        inputs: [
          {
            name: 'phone',
            type: 'tel',
            placeholder: '3001234567',
          },
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          {
            text: 'Abrir WhatsApp',
            handler: (data) => {
              const p = this.normalizePhone(data?.phone || '');
              if (p && p.length >= 10) {
                resolve(p);
                return true;
              } else {
                this.showToast('Ingrese un número válido', 'warning');
                return false;
              }
            },
          },
        ],
      }).then((alert) => alert.present());
    });
  }

  private openWhatsApp(phone: string, s: Sale): void {
    const text = this.buildReceiptText(s);
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  async shareEmail(): Promise<void> {
    const s = this.sale();
    if (!s) return;
    const blob = await this.captureReceiptAsImage();
    if (blob && navigator.share) {
      try {
        const file = new File([blob], `recibo_${(this.saleId || '').slice(0, 8)}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `Recibo de venta #${(this.saleId || '').slice(0, 8)}`,
          text: `${this.businessName} - Recibo de venta #${(this.saleId || '').slice(0, 8)}\nCliente: ${s.customerName || 'No especificado'}\nTotal: ${this.formatCurrency(s.total)}`,
        });
        await this.showToast('Recibo compartido', 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          this.shareEmailFallback(s);
        }
      }
    } else {
      this.shareEmailFallback(s);
    }
  }

  private shareEmailFallback(s: Sale): void {
    const subj = `Recibo de venta #${(this.saleId || '').slice(0, 8)}`;
    const body = this.buildReceiptText(s);
    const to = this.customerEmail ? `mailto:${this.customerEmail}?` : 'mailto:?';
    const url = `${to}subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  async downloadReceiptImage(): Promise<void> {
    const blob = await this.captureReceiptAsImage();
    if (!blob) {
      await this.showToast('No se pudo generar la imagen', 'danger');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo_${(this.saleId || '').slice(0, 8)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    await this.showToast('Imagen descargada', 'success');
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const t = await this.toastController.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
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
