export interface Product {
  id?: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  priceUnit: number;
  priceOffer: number;
  image: string;
  description: string;
  features: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  hotSale?: boolean;
  supplier: string;
  quantity: number;
  
}