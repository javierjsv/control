export interface StockAlertConfig {
  id?: string;
  defaultThreshold: number; // Umbral por defecto para todos los productos (ej: 10)
  enabled: boolean; // Si las alertas están habilitadas
  notifyOnDashboard: boolean; // Mostrar alertas en el dashboard
  notifyOnMenu: boolean; // Mostrar badge en el menú
  lastUpdated?: Date;
}

export interface ProductStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number; // Umbral configurado (puede ser del producto o global)
  category: string;
  image?: string;
  isCritical: boolean; // true si stock <= minStock * 0.5 (muy bajo)
}
