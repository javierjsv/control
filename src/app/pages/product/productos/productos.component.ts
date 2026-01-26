import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonMenuButton, 
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonImg,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonModal,
  IonInput,
  IonTextarea,
  IonCheckbox,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search } from 'ionicons/icons';
import { ProductsService } from '../../../services/products.service';
import { Product } from '../../../core/interfaces/product.interfaces';
import { LoadingService } from '../../../core/services/loading.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonMenuButton, 
    IonButtons,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonImg,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonModal,
    IonInput,
    IonTextarea,
    IonCheckbox,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    MatPaginatorModule
  ],
})
export class ProductosComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  productForm: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingProductId: string | null = null;
  isLoading = false;
  formSubmitted = false;
  searchTerm: string = '';
  private productsSubscription?: Subscription;
  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  hasMore = true;
  isLoadingMore = false;
  
  // Paginación para tabla
  paginatedProducts: Product[] = [];
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems = 0;

  private productsService = inject(ProductsService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search });
    
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      originalPrice: [0],
      image: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      features: ['', [Validators.required]], // Se guardará como string y se convertirá a array
      rating: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
      reviews: [0, [Validators.required, Validators.min(0)]],
      inStock: [true],
      hotSale: [false]
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  ngOnDestroy() {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }

  async loadProducts() {
    this.isLoading = true;
    this.loadingService.show('Cargando productos...');
    try {
      const result = await this.productsService.getPaginated();
      this.products = result.products;
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.updatePaginatedProducts();
      this.isLoading = false;
      this.loadingService.hide();
    } catch (error) {
      console.error('Error al cargar productos:', error);
      this.showToast('Error al cargar productos', 'danger');
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  async loadMoreProducts(event: any) {
    if (!this.lastDoc || !this.hasMore || this.isLoadingMore || this.searchTerm) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = await this.productsService.loadMore(this.lastDoc);
      this.products = [...this.products, ...result.products];
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.isLoadingMore = false;
      event.target.complete();
      
      if (!this.hasMore) {
        event.target.disabled = true;
      }
    } catch (error) {
      console.error('Error al cargar más productos:', error);
      this.showToast('Error al cargar más productos', 'danger');
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.applyFilter();
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredProducts = this.products;
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredProducts = this.products.filter(product =>
        product.name.toLowerCase().includes(searchLower)
      );
    }
    this.updatePaginatedProducts();
  }

  updatePaginatedProducts() {
    this.totalItems = this.filteredProducts.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedProducts();
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  openModal(product?: Product) {
    // Resetear el formulario y su estado
    this.formSubmitted = false;
    this.productForm.reset();
    
    // Marcar todos los controles como untouched
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsUntouched();
      this.productForm.get(key)?.markAsPristine();
    });
    
    if (product) {
      // Modo edición
      this.isEditing = true;
      this.editingProductId = product.id || null;
      this.productForm.patchValue({
        name: product.name,
        category: product.category,
        price: product.price,
        originalPrice: product.originalPrice || 0,
        image: product.image,
        description: product.description,
        features: product.features.join(', '), // Convertir array a string separado por comas
        rating: product.rating,
        reviews: product.reviews,
        inStock: product.inStock,
        hotSale: product.hotSale || false
      }, { emitEvent: false });
      
      // Marcar como pristine y untouched después de cargar los valores
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsUntouched();
        this.productForm.get(key)?.markAsPristine();
      });
    } else {
      // Modo creación
      this.isEditing = false;
      this.editingProductId = null;
      this.productForm.reset({
        name: '',
        category: '',
        price: 0,
        originalPrice: 0,
        image: '',
        description: '',
        features: '',
        rating: 0,
        reviews: 0,
        inStock: true,
        hotSale: false
      }, { emitEvent: false });
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.formSubmitted = false;
    this.productForm.reset();
    Object.keys(this.productForm.controls).forEach(key => {
      this.productForm.get(key)?.markAsUntouched();
      this.productForm.get(key)?.markAsPristine();
    });
    this.isEditing = false;
    this.editingProductId = null;
  }

  async saveProduct() {
    this.formSubmitted = true;
    console.log(this.productForm.value);
    if (this.productForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      this.showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    this.loadingService.show(this.isEditing ? 'Actualizando producto...' : 'Creando producto...');

    try {
      const formValue = this.productForm.value;
      
      // Convertir features de string a array
      const featuresArray = formValue.features
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      // Construir el objeto de producto, excluyendo campos undefined
      const productData: any = {
        name: formValue.name,
        category: formValue.category,
        price: formValue.price,
        image: formValue.image,
        description: formValue.description,
        features: featuresArray,
        rating: formValue.rating,
        reviews: formValue.reviews,
        inStock: formValue.inStock,
        hotSale: formValue.hotSale || false
      };

      // Solo incluir originalPrice si tiene un valor mayor a 0
      if (formValue.originalPrice && formValue.originalPrice > 0) {
        productData.originalPrice = formValue.originalPrice;
      }

      if (this.isEditing && this.editingProductId) {
        await this.productsService.update(this.editingProductId, productData);
        this.showToast('Producto actualizado correctamente', 'success');
      } else {
        await this.productsService.create(productData);
        this.showToast('Producto creado correctamente', 'success');
      }

      // Recargar productos y aplicar filtro
      await this.loadProducts();
      this.closeModal();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      this.showToast('Error al guardar el producto', 'danger');
      this.loadingService.hide();
    } finally {
      this.loadingService.hide();
    }
  }

  async deleteProduct(product: Product) {
    if (!product.id) {
      this.showToast('Error: ID del producto no encontrado', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar el producto "${product.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.loadingService.show('Eliminando producto...');

            try {
              await this.productsService.delete(product.id!);
              this.showToast('Producto eliminado correctamente', 'success');
              // Recargar productos y aplicar filtro
              await this.loadProducts();
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              this.showToast('Error al eliminar el producto', 'danger');
              this.loadingService.hide();
            } finally {
              this.loadingService.hide();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
