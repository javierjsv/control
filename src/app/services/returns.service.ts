import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  Timestamp,
  runTransaction,
} from '@angular/fire/firestore';
import { Return, ReturnItem, ReturnType, ReturnReason } from '../core/interfaces/return.interfaces';
import { Sale } from '../core/interfaces/sale.interfaces';
import { Product } from '../core/interfaces/product.interfaces';
import { SalesService } from './sales.service';
import { ProductsService } from './products.service';

@Injectable({
  providedIn: 'root',
})
export class ReturnsService {
  private readonly collectionName = 'returns';
  private readonly pageSize = 50;
  private firestore = inject(Firestore);
  private salesService = inject(SalesService);
  private productsService = inject(ProductsService);

  /**
   * Obtiene devoluciones paginadas (ordenadas por fecha descendente)
   */
  async getPaginated(): Promise<{
    returns: Return[];
    lastDoc: any | null;
    hasMore: boolean;
  }> {
    const returnsRef = collection(this.firestore, this.collectionName);
    const q = query(returnsRef, orderBy('createdAt', 'desc'), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const returns = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Return[];
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { returns, lastDoc, hasMore };
  }

  /**
   * Obtiene devoluciones por ID de venta
   */
  async getBySaleId(saleId: string): Promise<Return[]> {
    const returnsRef = collection(this.firestore, this.collectionName);
    const q = query(returnsRef, where('saleId', '==', saleId), orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Return[];
  }

  /**
   * Cancela una venta completa y repone todo el stock
   */
  async cancelFullSale(
    saleId: string,
    reason?: ReturnReason,
    notes?: string
  ): Promise<string> {
    // Obtener la venta
    const sale = await new Promise<Sale>((resolve, reject) => {
      const sub = this.salesService.getById(saleId).subscribe({
        next: (s) => {
          sub.unsubscribe();
          resolve(s);
        },
        error: reject,
      });
    });

    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.status === 'cancelled') {
      throw new Error('La venta ya está cancelada');
    }

    // Crear la devolución y reponer stock en una transacción
    const returnId = await runTransaction(this.firestore, async (transaction) => {
      // 1) LEER TODOS LOS PRODUCTOS
      const productRefs = sale.items.map((item) =>
        doc(this.firestore, 'products', item.productId)
      );

      const productSnaps = await Promise.all(
        productRefs.map((ref) => transaction.get(ref))
      );

      // 2) VALIDAR QUE LOS PRODUCTOS EXISTAN
      productSnaps.forEach((productSnap, index) => {
        const item = sale.items[index];
        if (!productSnap.exists()) {
          throw new Error(`Producto no encontrado: ${item.productName}`);
        }
      });

      // 3) REPONER STOCK
      productSnaps.forEach((productSnap, index) => {
        const item = sale.items[index];
        const productData = productSnap.data() as Product;
        const currentQty = productData.quantity ?? 0;

        transaction.update(productRefs[index], {
          quantity: currentQty + item.quantity,
        });
      });

      // 4) MARCAR LA VENTA COMO CANCELADA
      const saleRef = doc(this.firestore, 'sales', saleId);
      transaction.update(saleRef, { status: 'cancelled' });

      // 5) CREAR LA DEVOLUCIÓN
      const returnsRef = collection(this.firestore, this.collectionName);
      const returnDocRef = doc(returnsRef);

      const returnItems: ReturnItem[] = sale.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceUnit: item.priceUnit,
        total: item.total,
        reason,
      }));

      const returnData: Return = {
        saleId,
        returnType: 'full',
        items: returnItems,
        totalRefund: sale.total,
        reason,
        notes,
        createdAt: Timestamp.now(),
        customerId: sale.customerId,
        customerName: sale.customerName,
      };

      // Limpiar campos undefined
      const cleanReturnData: Record<string, unknown> = { ...returnData };
      Object.keys(cleanReturnData).forEach((key) => {
        if (cleanReturnData[key] === undefined) {
          delete cleanReturnData[key];
        }
      });

      transaction.set(returnDocRef, cleanReturnData);
      return returnDocRef.id;
    });

    return returnId;
  }

  /**
   * Realiza una devolución parcial de una venta
   */
  async createPartialReturn(
    saleId: string,
    returnItems: ReturnItem[],
    reason?: ReturnReason,
    notes?: string
  ): Promise<string> {
    if (!returnItems || returnItems.length === 0) {
      throw new Error('Debe especificar al menos un ítem para devolver');
    }

    // Obtener la venta
    const sale = await new Promise<Sale>((resolve, reject) => {
      const sub = this.salesService.getById(saleId).subscribe({
        next: (s) => {
          sub.unsubscribe();
          resolve(s);
        },
        error: reject,
      });
    });

    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.status === 'cancelled') {
      throw new Error('La venta ya está cancelada');
    }

    // Validar que los ítems a devolver existan en la venta original
    const saleItemMap = new Map(
      sale.items.map((item) => [`${item.productId}-${item.priceUnit}`, item])
    );

    // Verificar cantidades devueltas vs vendidas
    const returnItemMap = new Map<string, number>();
    returnItems.forEach((returnItem) => {
      const key = `${returnItem.productId}-${returnItem.priceUnit}`;
      const originalItem = saleItemMap.get(key);
      
      if (!originalItem) {
        throw new Error(
          `El producto "${returnItem.productName}" no existe en la venta original`
        );
      }

      const alreadyReturned = returnItemMap.get(key) || 0;
      const totalToReturn = alreadyReturned + returnItem.quantity;

      if (totalToReturn > originalItem.quantity) {
        throw new Error(
          `No se puede devolver más cantidad de la vendida para "${returnItem.productName}". Vendido: ${originalItem.quantity}, Intentando devolver: ${totalToReturn}`
        );
      }

      returnItemMap.set(key, totalToReturn);
    });

    // Calcular total a reembolsar
    const totalRefund = returnItems.reduce((sum, item) => sum + item.total, 0);

    // Crear la devolución y reponer stock en una transacción
    const returnId = await runTransaction(this.firestore, async (transaction) => {
      // 1) LEER TODOS LOS PRODUCTOS A DEVOLVER
      const productRefs = returnItems.map((item) =>
        doc(this.firestore, 'products', item.productId)
      );

      const productSnaps = await Promise.all(
        productRefs.map((ref) => transaction.get(ref))
      );

      // 2) VALIDAR QUE LOS PRODUCTOS EXISTAN
      productSnaps.forEach((productSnap, index) => {
        const item = returnItems[index];
        if (!productSnap.exists()) {
          throw new Error(`Producto no encontrado: ${item.productName}`);
        }
      });

      // 3) REPONER STOCK
      productSnaps.forEach((productSnap, index) => {
        const item = returnItems[index];
        const productData = productSnap.data() as Product;
        const currentQty = productData.quantity ?? 0;

        transaction.update(productRefs[index], {
          quantity: currentQty + item.quantity,
        });
      });

      // 4) CREAR LA DEVOLUCIÓN
      const returnsRef = collection(this.firestore, this.collectionName);
      const returnDocRef = doc(returnsRef);

      const returnData: Return = {
        saleId,
        returnType: 'partial',
        items: returnItems,
        totalRefund,
        reason,
        notes,
        createdAt: Timestamp.now(),
        customerId: sale.customerId,
        customerName: sale.customerName,
      };

      // Limpiar campos undefined
      const cleanReturnData: Record<string, unknown> = { ...returnData };
      Object.keys(cleanReturnData).forEach((key) => {
        if (cleanReturnData[key] === undefined) {
          delete cleanReturnData[key];
        }
      });

      transaction.set(returnDocRef, cleanReturnData);
      return returnDocRef.id;
    });

    return returnId;
  }

  /**
   * Obtiene todas las devoluciones (sin paginación, para reportes)
   */
  async getAll(): Promise<Return[]> {
    const returnsRef = collection(this.firestore, this.collectionName);
    const q = query(returnsRef, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Return[];
  }
}
