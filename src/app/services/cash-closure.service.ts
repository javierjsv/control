import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { ReportsService } from './reports.service';
import {
  CashClosure,
  SalesSummaryForDay,
  PaymentMethodType,
  PAYMENT_METHOD_LABELS,
} from '../core/interfaces/cash-closure.interfaces';
@Injectable({
  providedIn: 'root',
})
export class CashClosureService {
  private readonly collectionName = 'cash_closures';
  private firestore = inject(Firestore);
  private reportsService = inject(ReportsService);

  /**
   * Obtiene el resumen de ventas registradas para un día (por método de pago)
   */
  async getSalesSummaryForDate(date: Date): Promise<SalesSummaryForDay> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const sales = await this.reportsService.getSalesInRange(start, end);
    const byMethod = new Map<PaymentMethodType, { total: number; count: number }>();

    const methods: PaymentMethodType[] = ['cash', 'card', 'transfer', 'other'];
    methods.forEach((m) => byMethod.set(m, { total: 0, count: 0 }));

    sales.forEach((sale) => {
      const method = (sale.paymentMethod || 'other') as PaymentMethodType;
      const cur = byMethod.get(method) ?? { total: 0, count: 0 };
      cur.total += sale.total ?? 0;
      cur.count += 1;
      byMethod.set(method, cur);
    });

    const total = sales.reduce((sum, s) => sum + (s.total ?? 0), 0);
    const byMethodArray = methods.map((method) => {
      const d = byMethod.get(method)!;
      return { method, total: d.total, count: d.count };
    });

    return {
      date: date.toISOString().slice(0, 10),
      total,
      count: sales.length,
      byMethod: byMethodArray,
    };
  }

  /**
   * Registra un cierre de caja
   */
  async createClosure(closure: Omit<CashClosure, 'id'>): Promise<string> {
    const ref = collection(this.firestore, this.collectionName);
    const data: Record<string, unknown> = {
      ...closure,
      closedAt: closure.closedAt instanceof Date ? Timestamp.fromDate(closure.closedAt) : closure.closedAt,
    };
    Object.keys(data).forEach((k) => {
      if (data[k] === undefined) delete data[k];
    });
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }

  /**
   * Historial de cortes: todos, ordenados por fecha descendente
   */
  async getAll(): Promise<CashClosure[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('closureDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CashClosure[];
  }

  /**
   * Cortes en un rango de fechas (filtrado en memoria)
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<CashClosure[]> {
    const all = await this.getAll();
    const start = startDate.toISOString().slice(0, 10);
    const end = endDate.toISOString().slice(0, 10);
    return all.filter((c) => c.closureDate >= start && c.closureDate <= end);
  }

  /**
   * Verifica si ya existe un cierre para una fecha
   */
  async hasClosureForDate(date: Date): Promise<boolean> {
    const d = date.toISOString().slice(0, 10);
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('closureDate', '==', d));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  getPaymentMethodLabel(method: PaymentMethodType): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }
}
