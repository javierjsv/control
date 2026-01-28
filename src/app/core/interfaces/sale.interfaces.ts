import { Timestamp } from '@angular/fire/firestore';

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  priceUnit: number; // precio unitario usado en la venta
  total: number;     // quantity * priceUnit
}

export interface Sale {
  id?: string;

  // Relación con cliente (opcional)
  customerId?: string;
  customerName?: string;

  // Ítems de la venta (puede ser 1 producto o varios)
  items: SaleItem[];

  // Totales
  subtotal: number;
  discount?: number;
  total: number;

  // Forma de pago y estado
  paymentMethod: 'cash' | 'card' | 'transfer' | 'other';
  status: 'completed' | 'cancelled';

  // Metadatos
  createdAt?: Timestamp | Date;
  createdByUserId?: string;
}

