import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonToast,
  IonSpinner,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark } from 'ionicons/icons';
import { ProductsService } from '../../services/products.service';
import { Product } from '../../core/interfaces/product.interfaces';
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
    IonToast,
    IonSpinner
  ],
})
export class ProductosComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  productForm: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingProductId: string | null = null;
  isLoading = false;
  formSubmitted = false;
  private productsSubscription?: Subscription;

  constructor(
    private productsService: ProductsService,
    private fb: FormBuilder,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {
    addIcons({ add, create, trash, close, checkmark });
    
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

  loadProducts() {
    this.isLoading = true;
    this.productsSubscription = this.productsService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.showToast('Error al cargar productos', 'danger');
        this.isLoading = false;
      }
    });
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
    
    if (this.productForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.productForm.controls).forEach(key => {
        this.productForm.get(key)?.markAsTouched();
      });
      this.showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditing ? 'Actualizando producto...' : 'Creando producto...',
    });
    await loading.present();

    try {
      const formValue = this.productForm.value;
      
      // Convertir features de string a array
      const featuresArray = formValue.features
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.length > 0);

      const productData: Omit<Product, 'id'> = {
        name: formValue.name,
        category: formValue.category,
        price: formValue.price,
        originalPrice: formValue.originalPrice > 0 ? formValue.originalPrice : undefined,
        image: formValue.image,
        description: formValue.description,
        features: featuresArray,
        rating: formValue.rating,
        reviews: formValue.reviews,
        inStock: formValue.inStock,
        hotSale: formValue.hotSale || false
      };

      if (this.isEditing && this.editingProductId) {
        await this.productsService.update(this.editingProductId, productData);
        this.showToast('Producto actualizado correctamente', 'success');
      } else {
        await this.productsService.create(productData);
        this.showToast('Producto creado correctamente', 'success');
      }

      this.closeModal();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      this.showToast('Error al guardar el producto', 'danger');
    } finally {
      await loading.dismiss();
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
            const loading = await this.loadingController.create({
              message: 'Eliminando producto...',
            });
            await loading.present();

            try {
              await this.productsService.delete(product.id!);
              this.showToast('Producto eliminado correctamente', 'success');
            } catch (error) {
              console.error('Error al eliminar producto:', error);
              this.showToast('Error al eliminar el producto', 'danger');
            } finally {
              await loading.dismiss();
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
