export type ReportPeriod = 'day' | 'week' | 'month';

export interface SalesByPeriodItem {
  date: string;
  label: string;
  total: number;
  count: number;
}

export interface TopProductReport {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  category?: string;
}

export interface IncomeVsExpensesReport {
  period: string;
  income: number;
  expenses: number;
  profit: number;
  profitMargin: number; // porcentaje
  items?: { date: string; income: number; expenses: number; profit: number }[];
}

export interface FrequentCustomerReport {
  customerId: string;
  customerName: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export interface ReportFilters {
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
}

export interface FullReport {
  filters: ReportFilters;
  salesByPeriod: SalesByPeriodItem[];
  topProducts: TopProductReport[];
  incomeVsExpenses: IncomeVsExpensesReport | null;
  frequentCustomers: FrequentCustomerReport[];
  summary: {
    totalSales: number;
    totalSalesCount: number;
    averageTicket: number;
  };
}
