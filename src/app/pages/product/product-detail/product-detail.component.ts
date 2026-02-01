import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { alertCircle, star, starOutline } from 'ionicons/icons';
import { Product } from '../../../core/interfaces/product.interfaces';
import { ProductsService } from '../../../services/products.service';
import { LoadingService } from '../../../core/services/loading.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner
  ],
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  productId: string | null = null;
  isLoading = true;
  error: string | null = null;
  private route = inject(ActivatedRoute);
  private routerService = inject(Router);
  private productsService = inject(ProductsService);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);
  router = this.routerService; // Exponer router para el template
  private productSubscription?: Subscription;

  constructor() {
    addIcons({ alertCircle, star, starOutline });
  }

  ngOnInit() {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.loadProduct();
    } else {
      this.error = 'ID de producto no válido';
      this.isLoading = false;
      this.showErrorAndRedirect('ID de producto no encontrado');
    }
  }

  ngOnDestroy() {
    if (this.productSubscription) {
      this.productSubscription.unsubscribe();
    }
  }

  loadProduct() {
    if (!this.productId) {
      this.error = 'ID de producto no válido';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.loadingService.show('Cargando producto...');

    this.productSubscription = this.productsService.getById(this.productId).subscribe({
      next: (product) => {
        if (product) {
          this.product = product;
          this.isLoading = false;
          this.loadingService.hide();
        } else {
          this.error = 'Producto no encontrado';
          this.isLoading = false;
          this.loadingService.hide();
          this.showErrorAndRedirect('El producto no existe');
        }
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);
        this.error = 'Error al cargar el producto';
        this.isLoading = false;
        this.loadingService.hide();
        this.showErrorAndRedirect('Error al cargar el producto. Intenta nuevamente.');
      }
    });
  }

  async showErrorAndRedirect(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
    
    // Redirigir después de mostrar el error
    setTimeout(() => {
      this.routerService.navigate(['/tabs/tab1']);
    }, 2000);
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
