import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Product } from 'src/app/core/interfaces/product.interfaces';


@Component({
  selector: 'app-product-detail',
  standalone: true,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  productId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.loadProduct();
  }

  loadProduct() {
    // Por ahora, data quemada - luego se conectará a un servicio
    const products: Product[] = [
      {
        id: '1',
        name: 'UltraBook Pro X',
        category: 'HIGH-PERFORMANCE LAPTOP',
        price: 1999.00,
        originalPrice: 2499.00,
        image: 'https://picsum.photos/id/237/800/600',
        description: 'Cutting-edge performance with Intel Core i9, 32GB RAM, and a 1TB SSD in a sleek, lightweight design. Perfect for professionals and power users who demand the best.',
        features: ['4K Display', '16-Hour Battery', 'Thunderbolt 4', 'Intel Core i9', '32GB RAM', '1TB SSD'],
        rating: 4,
        reviews: 245,
        inStock: true,
        hotSale: true
      },
      {
        id: '2',
        name: 'Smart Watch Pro',
        category: 'WEARABLE TECHNOLOGY',
        price: 299.00,
        originalPrice: 399.00,
        image: 'https://picsum.photos/id/237/800/600',
        description: 'Advanced fitness tracking with heart rate monitor, GPS, and 7-day battery life. Stay connected and healthy with this premium smartwatch.',
        features: ['GPS', 'Heart Rate', 'Waterproof', '7-Day Battery', 'Fitness Tracking'],
        rating: 4.5,
        reviews: 128,
        inStock: true,
        hotSale: true
      },
      {
        id: '3',
        name: 'Wireless Headphones',
        category: 'AUDIO EQUIPMENT',
        price: 149.00,
        originalPrice: 199.00,
        image: 'https://picsum.photos/id/237/800/600',
        description: 'Premium sound quality with active noise cancellation and 30-hour battery life. Experience music like never before.',
        features: ['Noise Cancel', '30h Battery', 'Bluetooth 5.0', 'Premium Sound', 'Comfortable Fit'],
        rating: 4.2,
        reviews: 89,
        inStock: true,
        hotSale: false
      }
    ];

    if (this.productId) {
      this.product = products.find(p => p.id === this.productId) || products[0];
    } else {
      this.product = products[0];
    }
  }

  getStars(rating: number): Array<'full' | 'empty'> {
    const stars: Array<'full' | 'empty'> = [];
    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('full');
      } else {
        stars.push('empty');
      }
    }
    
    return stars;
  }
}
