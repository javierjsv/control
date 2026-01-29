import { Timestamp } from '@angular/fire/firestore';
import { SaleItem } from './sale.interfaces';

export type ReturnReason = 
  | 'defective' 
  | 'wrong_item' 
  | 'customer_request' 
  | 'damaged' 
  | 'other';

export type ReturnType = 'full' | 'partial';

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number; // Cantidad devuelta
  priceUnit: number; // Precio unitario original de la venta
  total: number; // quantity * priceUnit
  reason?: ReturnReason;
}

export interface Return {
  id?: string;
  
  // Relación con la venta original
  saleId: string;
  
  // Tipo de devolución
  returnType: ReturnType; // 'full' o 'partial'
  
  // Ítems devueltos (si es parcial, solo los ítems devueltos)
  items: ReturnItem[];
  
  // Totales
  totalRefund: number; // Total a reembolsar
  
  // Razón de la devolución
  reason?: ReturnReason;
  notes?: string; // Notas adicionales
  
  // Metadatos
  createdAt?: Timestamp | Date;
  createdByUserId?: string;
  
  // Información del cliente (si aplica)
  customerId?: string;
  customerName?: string;
}
