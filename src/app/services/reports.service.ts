import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from '@angular/fire/firestore';
import { Sale } from '../core/interfaces/sale.interfaces';
import { Product } from '../core/interfaces/product.interfaces';
import { firstValueFrom } from 'rxjs';
import { ProductsService } from './products.service';
import {
  ReportPeriod,
  FullReport,
  ReportFilters,
  SalesByPeriodItem,
  TopProductReport,
  IncomeVsExpensesReport,
  FrequentCustomerReport,
} from '../core/interfaces/report.interfaces';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly salesCollection = 'sales';
  private readonly maxSalesToFetch = 2000;
  private firestore = inject(Firestore);
  private productsService = inject(ProductsService);

  /**
   * Obtiene ventas en un rango de fechas (filtradas en memoria)
   */
  async getSalesInRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const salesRef = collection(this.firestore, this.salesCollection);
    const q = query(
      salesRef,
      orderBy('createdAt', 'desc'),
      limit(this.maxSalesToFetch)
    );
    const snapshot = await getDocs(q);
    const allSales = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Sale[];
    const completed = allSales.filter((s) => s.status === 'completed');

    return completed.filter((sale) => {
      if (!sale.createdAt) return false;
      const saleDate = (sale.createdAt as any).toDate
        ? (sale.createdAt as any).toDate() as Date
        : new Date(sale.createdAt as any);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }

  /**
   * Genera el reporte completo según filtros
   */
  async getFullReport(filters: ReportFilters): Promise<FullReport> {
    const sales = await this.getSalesInRange(filters.startDate, filters.endDate);
    const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalSalesCount = sales.length;
    const averageTicket = totalSalesCount > 0 ? totalSales / totalSalesCount : 0;

    const salesByPeriod = this.buildSalesByPeriod(sales, filters.period, filters.startDate, filters.endDate);
    const topProducts = this.buildTopProducts(sales);
    const incomeVsExpenses = await this.buildIncomeVsExpenses(sales);
    const frequentCustomers = this.buildFrequentCustomers(sales);

    return {
      filters,
      salesByPeriod,
      topProducts,
      incomeVsExpenses,
      frequentCustomers,
      summary: {
        totalSales,
        totalSalesCount,
        averageTicket,
      },
    };
  }

  private buildSalesByPeriod(sales: Sale[], period: ReportPeriod, startDate: Date, endDate: Date): SalesByPeriodItem[] {
    const result: SalesByPeriodItem[] = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (period === 'day') {
      const day = new Date(start);
      while (day <= end) {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const daySales = sales.filter((s) => {
          const d = this.getSaleDate(s);
          return d >= day && d < next;
        });
        result.push({
          date: day.toISOString().slice(0, 10),
          label: day.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }),
          total: daySales.reduce((sum, s) => sum + (s.total || 0), 0),
          count: daySales.length,
        });
        day.setDate(day.getDate() + 1);
      }
    } else if (period === 'week') {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      while (weekStart <= end) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekSales = sales.filter((s) => {
          const d = this.getSaleDate(s);
          return d >= weekStart && d <= weekEnd;
        });
        result.push({
          date: weekStart.toISOString().slice(0, 10),
          label: `Semana ${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          total: weekSales.reduce((sum, s) => sum + (s.total || 0), 0),
          count: weekSales.length,
        });
        weekStart.setDate(weekStart.getDate() + 7);
      }
    } else {
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      while (monthStart <= end) {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        const monthSales = sales.filter((s) => {
          const d = this.getSaleDate(s);
          return d >= monthStart && d <= monthEnd;
        });
        result.push({
          date: monthStart.toISOString().slice(0, 7),
          label: monthStart.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
          total: monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
          count: monthSales.length,
        });
        monthStart.setMonth(monthStart.getMonth() + 1);
      }
    }
    return result;
  }

  private buildTopProducts(sales: Sale[], limitCount: number = 20): TopProductReport[] {
    const map = new Map<string, { name: string; totalSold: number; totalRevenue: number }>();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = map.get(item.productId) || {
          name: item.productName,
          totalSold: 0,
          totalRevenue: 0,
        };
        existing.totalSold += item.quantity;
        existing.totalRevenue += item.total;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        totalSold: data.totalSold,
        totalRevenue: data.totalRevenue,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limitCount);
  }

  private async buildIncomeVsExpenses(sales: Sale[]): Promise<IncomeVsExpensesReport | null> {
    const products = await firstValueFrom(this.productsService.getAll());
    const productMap = new Map(products.filter((p) => p.id).map((p) => [p.id!, p]));
    let hasAnyCost = false;
    let totalIncome = 0;
    let totalExpenses = 0;
    sales.forEach((sale) => {
      totalIncome += sale.total || 0;
      sale.items.forEach((item) => {
        const product = productMap.get(item.productId);
        const costPerUnit = product?.priceBuy ?? 0;
        if (costPerUnit > 0) hasAnyCost = true;
        totalExpenses += item.quantity * costPerUnit;
      });
    });
    if (!hasAnyCost) return null;
    const profit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
    return {
      period: 'Período seleccionado',
      income: totalIncome,
      expenses: totalExpenses,
      profit,
      profitMargin,
    };
  }

  private buildFrequentCustomers(sales: Sale[], limitCount: number = 20): FrequentCustomerReport[] {
    const map = new Map<string, { name: string; totalPurchases: number; totalSpent: number; lastDate: Date }>();
    sales.forEach((sale) => {
      const key = sale.customerId || sale.customerName || 'Sin cliente';
      const name = sale.customerName || 'Sin nombre';
      const existing = map.get(key);
      const saleDate = this.getSaleDate(sale);
      if (existing) {
        existing.totalPurchases += 1;
        existing.totalSpent += sale.total || 0;
        if (saleDate > existing.lastDate) existing.lastDate = saleDate;
      } else {
        map.set(key, {
          name,
          totalPurchases: 1,
          totalSpent: sale.total || 0,
          lastDate: saleDate,
        });
      }
    });
    return Array.from(map.entries())
      .filter(([key]) => key !== 'Sin cliente')
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        totalPurchases: data.totalPurchases,
        totalSpent: data.totalSpent,
        lastPurchaseDate: data.lastDate.toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, limitCount);
  }

  private getSaleDate(sale: Sale): Date {
    if (!sale.createdAt) return new Date(0);
    return (sale.createdAt as any).toDate
      ? (sale.createdAt as any).toDate() as Date
      : new Date(sale.createdAt as any);
  }

  private getStartOfPeriod(period: ReportPeriod): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === 'day') {
      return d;
    }
    if (period === 'week') {
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      return d;
    }
    d.setDate(1);
    return d;
  }

  private getEndOfPeriod(period: ReportPeriod): Date {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    if (period === 'day') return d;
    if (period === 'week') {
      const day = d.getDay();
      d.setDate(d.getDate() + (6 - day));
      return d;
    }
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  }

  /**
   * Obtiene fechas de inicio y fin según período seleccionado
   */
  getDateRangeForPeriod(period: ReportPeriod): { startDate: Date; endDate: Date } {
    const endDate = this.getEndOfPeriod(period);
    const startDate = this.getStartOfPeriod(period);
    if (period === 'day') return { startDate, endDate };
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 6 * 7); // últimas 7 semanas
      return { startDate, endDate };
    }
    startDate.setMonth(startDate.getMonth() - 11); // últimos 12 meses
    return { startDate, endDate };
  }
}
