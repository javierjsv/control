import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Sale } from '../core/interfaces/sale.interfaces';
import { Product } from '../core/interfaces/product.interfaces';
import { DashboardStats } from '../core/interfaces/dashboard.interfaces';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly collectionName = 'sales';
  private readonly pageSize = 50;
  private firestore = inject(Firestore);

  /**
   * Obtiene ventas paginadas (ordenadas por fecha descendente)
   */
  async getPaginated(): Promise<{
    sales: Sale[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    const salesRef = collection(this.firestore, this.collectionName);
    const q = query(salesRef, orderBy('createdAt', 'desc'), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const sales = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { sales, lastDoc, hasMore };
  }

  /**
   * Carga más ventas (paginación)
   */
  async loadMore(
    lastDoc: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ sales: Sale[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    const salesRef = collection(this.firestore, this.collectionName);
    const q = query(salesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const sales = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { sales, lastDoc: newLastDoc, hasMore };
  }

  /**
   * Obtiene una venta por ID
   */
  getById(id: string): Observable<Sale> {
    const saleRef = doc(this.firestore, this.collectionName, id);
    return docData(saleRef, { idField: 'id' }) as Observable<Sale>;
  }

  /**
   * Crea una venta y actualiza el stock de productos en una sola transacción.
   * - Calcula subtotal y total si no vienen calculados.
   * - Resta la cantidad vendida del campo quantity de cada producto.
   * - Falla si algún producto no tiene stock suficiente.
   */
  async createSaleAndUpdateStock(
    sale: Omit<Sale, 'id' | 'createdAt'>,
  ): Promise<string> {
    const saleId = await runTransaction(this.firestore, async (transaction) => {
      // Calcular totales si no vienen calculados
      const subtotal =
        sale.subtotal ??
        sale.items.reduce((acc, item) => acc + item.total, 0);
      const discount = sale.discount ?? 0;
      const total = sale.total ?? Math.max(subtotal - discount, 0);

      // 1) LEER TODOS LOS PRODUCTOS (todas las lecturas antes de cualquier escritura)
      const productRefs = sale.items.map((item) =>
        doc(this.firestore, 'products', item.productId)
      );

      const productSnaps = await Promise.all(
        productRefs.map((ref) => transaction.get(ref))
      );

      // 2) VALIDAR STOCK CON LAS LECTURAS YA HECHAS
      productSnaps.forEach((productSnap, index) => {
        const item = sale.items[index];

        if (!productSnap.exists()) {
          throw new Error(`Producto no encontrado: ${item.productName}`);
        }

        const productData = productSnap.data() as Product;
        const currentQty = productData.quantity ?? 0;

        if (currentQty < item.quantity) {
          throw new Error(
            `Stock insuficiente para el producto "${productData.name}". Disponible: ${currentQty}, solicitado: ${item.quantity}`,
          );
        }
      });

      // 3) APLICAR LAS ESCRITURAS (actualizar stock)
      productSnaps.forEach((productSnap, index) => {
        const item = sale.items[index];
        const productData = productSnap.data() as Product;
        const currentQty = productData.quantity ?? 0;

        transaction.update(productRefs[index], {
          quantity: currentQty - item.quantity,
        });
      });

      // 4) CREAR LA VENTA (eliminando campos undefined antes de enviar a Firestore)
      const salesRef = collection(this.firestore, this.collectionName);
      const saleDocRef = doc(salesRef);

      const rawSaleData: Omit<Sale, 'id'> = {
        ...sale,
        subtotal,
        discount,
        total,
        createdAt: Timestamp.now(),
      };

      // Firestore no acepta undefined: limpiamos el objeto
      const saleData: Record<string, unknown> = { ...rawSaleData };
      Object.keys(saleData).forEach((key) => {
        if (saleData[key] === undefined) {
          delete saleData[key];
        }
      });

      transaction.set(saleDocRef, saleData);
      return saleDocRef.id;
    });

    return saleId;
  }

  /**
   * Cancela una venta (marcar status = 'cancelled').
   * Opcionalmente podrías reponer stock aquí en el futuro.
   */
  async cancelSale(id: string): Promise<void> {
    const saleRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(saleRef, { status: 'cancelled' });
  }

  /**
   * Elimina una venta definitivamente (no repone stock).
   * Úsalo solo para casos administrativos.
   */
  async deleteSale(id: string): Promise<void> {
    const saleRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(saleRef);
  }

  /**
   * Obtiene estadísticas del dashboard
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const salesRef = collection(this.firestore, this.collectionName);
    
    // Obtener todas las ventas completadas (últimos 30 días para optimizar)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Obtener todas las ventas de los últimos 30 días
    const q = query(
      salesRef,
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const allSales = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Sale[];

    // Filtrar ventas completadas
    const completedSales = allSales.filter((s) => s.status === 'completed');

    // Ventas del día
    const todaySales = completedSales.filter((sale) => {
      if (!sale.createdAt) return false;
      const saleDate = (sale.createdAt as any).toDate
        ? (sale.createdAt as any).toDate() as Date
        : new Date(sale.createdAt as any);
      return saleDate >= startOfToday && saleDate <= endOfToday;
    });

    const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    const todayCount = todaySales.length;
    const todayAverage = todayCount > 0 ? todayTotal / todayCount : 0;

    // Ventas últimos 7 días (para gráfico)
    const last7DaysSales: { date: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = completedSales.filter((sale) => {
        if (!sale.createdAt) return false;
        const saleDate = (sale.createdAt as any).toDate
          ? (sale.createdAt as any).toDate() as Date
          : new Date(sale.createdAt as any);
        return saleDate >= date && saleDate < nextDate;
      });

      last7DaysSales.push({
        date: date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
        total: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
        count: daySales.length,
      });
    }

    // Top productos más vendidos (últimos 30 días)
    const productMap = new Map<string, { name: string; totalSold: number; totalRevenue: number }>();
    completedSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productMap.get(item.productId) || {
          name: item.productName,
          totalSold: 0,
          totalRevenue: 0,
        };
        existing.totalSold += item.quantity;
        existing.totalRevenue += item.total;
        productMap.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        totalSold: data.totalSold,
        totalRevenue: data.totalRevenue,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Métodos de pago del día
    const paymentMethodsMap = new Map<string, { total: number; count: number }>();
    todaySales.forEach((sale) => {
      const method = sale.paymentMethod || 'other';
      const existing = paymentMethodsMap.get(method) || { total: 0, count: 0 };
      existing.total += sale.total || 0;
      existing.count += 1;
      paymentMethodsMap.set(method, existing);
    });

    const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, data]) => ({
      method: method as 'cash' | 'card' | 'transfer' | 'other',
      total: data.total,
      count: data.count,
    }));

    return {
      todaySales: {
        total: todayTotal,
        count: todayCount,
        average: todayAverage,
      },
      last7DaysSales,
      topProducts,
      lowStockProducts: [], // Se llenará desde ProductsService
      paymentMethods,
    };
  }
}

