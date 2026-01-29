export interface DashboardStats {
  // Ventas del día
  todaySales: {
    total: number;
    count: number;
    average: number;
  };
  
  // Ventas últimos 7 días (para gráfico)
  last7DaysSales: {
    date: string;
    total: number;
    count: number;
  }[];
  
  // Top productos más vendidos
  topProducts: {
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
  }[];
  
  // Productos con stock bajo
  lowStockProducts: {
    id: string;
    name: string;
    quantity: number;
    category: string;
  }[];
  
  // Métodos de pago del día
  paymentMethods: {
    method: 'cash' | 'card' | 'transfer' | 'other';
    total: number;
    count: number;
  }[];
}
