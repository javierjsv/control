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

      // Verificar y actualizar stock de cada producto
      for (const item of sale.items) {
        const productRef = doc(this.firestore, 'products', item.productId);
        const productSnap = await transaction.get(productRef);

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

        transaction.update(productRef, {
          quantity: currentQty - item.quantity,
        });
      }

      // Crear la venta (eliminando campos undefined antes de enviar a Firestore)
      const salesRef = collection(this.firestore, this.collectionName);
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

      const docRef = await addDoc(salesRef, saleData);
      return docRef.id;
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
}

