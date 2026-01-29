import { Timestamp } from '@angular/fire/firestore';

export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'other';

export interface PaymentMethodSummary {
  method: PaymentMethodType;
  label: string;
  salesTotal: number;
  salesCount: number;
  declaredTotal: number;
  difference: number;
}

export interface SalesSummaryForDay {
  date: string;
  total: number;
  count: number;
  byMethod: {
    method: PaymentMethodType;
    total: number;
    count: number;
  }[];
}

export interface CashClosure {
  id?: string;
  closureDate: string;
  closedAt: Timestamp | Date;
  salesTotal: number;
  salesCount: number;
  salesByMethod: { method: string; total: number; count: number }[];
  declaredCash: number;
  declaredCard: number;
  declaredTransfer: number;
  declaredOther: number;
  totalDeclared: number;
  difference: number;
  notes?: string;
  createdByUserId?: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};
