export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  features: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  hotSale?: boolean;
}