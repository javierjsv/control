import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  setDoc,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StockAlertConfig, ProductStockAlert } from '../core/interfaces/stock-alert.interfaces';
import { Product } from '../core/interfaces/product.interfaces';

@Injectable({
  providedIn: 'root',
})
export class StockAlertService {
  private readonly configCollection = 'stockAlertConfig';
  private readonly configDocId = 'default';
  private firestore = inject(Firestore);

  /**
   * Obtiene la configuración de alertas de stock
   */
  getConfig(): Observable<StockAlertConfig> {
    const configRef = doc(this.firestore, this.configCollection, this.configDocId);
    return docData(configRef, { idField: 'id' }).pipe(
      map((data) => {
        if (data && Object.keys(data).length > 0) {
          return data as StockAlertConfig;
        }
        // Configuración por defecto si no existe
        return this.getDefaultConfig();
      }),
      catchError(() => of(this.getDefaultConfig()))
    ) as Observable<StockAlertConfig>;
  }

  /**
   * Guarda la configuración de alertas
   */
  async saveConfig(config: Partial<StockAlertConfig>): Promise<void> {
    const configRef = doc(this.firestore, this.configCollection, this.configDocId);
    const currentConfig = await this.getConfig().pipe(
      map((c) => ({ ...c, ...config, lastUpdated: new Date() }))
    ).toPromise();
    
    await setDoc(configRef, currentConfig, { merge: true });
  }

  /**
   * Obtiene la configuración por defecto
   */
  private getDefaultConfig(): StockAlertConfig {
    return {
      id: this.configDocId,
      defaultThreshold: 10,
      enabled: true,
      notifyOnDashboard: true,
      notifyOnMenu: true,
      lastUpdated: new Date(),
    };
  }

  /**
   * Verifica si un producto tiene stock bajo
   * Usa el minStock del producto si existe, sino usa el umbral global
   */
  isLowStock(product: Product, globalThreshold: number): boolean {
    const threshold = product.minStock ?? globalThreshold;
    return (product.quantity ?? 0) <= threshold;
  }

  /**
   * Obtiene el umbral a usar para un producto específico
   */
  getProductThreshold(product: Product, globalThreshold: number): number {
    return product.minStock ?? globalThreshold;
  }

  /**
   * Verifica si el stock es crítico (muy bajo, menos del 50% del umbral)
   */
  isCriticalStock(product: Product, globalThreshold: number): boolean {
    const threshold = this.getProductThreshold(product, globalThreshold);
    return (product.quantity ?? 0) <= threshold * 0.5;
  }

  /**
   * Obtiene productos con alertas de stock bajo
   */
  async getStockAlerts(
    products: Product[],
    globalThreshold: number
  ): Promise<ProductStockAlert[]> {
    const alerts: ProductStockAlert[] = [];

    products.forEach((product) => {
      if (this.isLowStock(product, globalThreshold)) {
        const threshold = this.getProductThreshold(product, globalThreshold);
        alerts.push({
          productId: product.id || '',
          productName: product.name,
          currentStock: product.quantity ?? 0,
          minStock: threshold,
          category: product.category,
          image: product.image,
          isCritical: this.isCriticalStock(product, globalThreshold),
        });
      }
    });

    // Ordenar: críticos primero, luego por cantidad (menor primero)
    return alerts.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return a.currentStock - b.currentStock;
    });
  }
}
