export interface Product {
  id?: string;
  name: string;
  category: string;
  priceBuy?: number;
  priceSale: number;
  priceOffer?: number;
  image: string;
  description: string;
  features: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  hotSale?: boolean;
  supplier: string;
  quantity: number;
  minStock?: number; // Umbral mínimo de stock para alertas (opcional, si no existe usa el global)
}