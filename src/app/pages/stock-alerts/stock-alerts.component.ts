import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonMenuButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonToggle,
  IonList,
  IonSpinner,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settings, save, alertCircle, checkmarkCircle } from 'ionicons/icons';
import { StockAlertService } from '../../services/stock-alert.service';
import { ProductsService } from '../../services/products.service';
import { StockAlertConfig, ProductStockAlert } from '../../core/interfaces/stock-alert.interfaces';
import { Product } from '../../core/interfaces/product.interfaces';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-stock-alerts',
  templateUrl: './stock-alerts.component.html',
  styleUrls: ['./stock-alerts.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonMenuButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonToggle,
    IonList,
    IonSpinner,
  ],
})
export class StockAlertsComponent implements OnInit {
  config: StockAlertConfig | null = null;
  products: Product[] = [];
  productAlerts: ProductStockAlert[] = [];
  isLoading = false;
  isSaving = false;
  searchTerm = '';

  // Productos con umbrales editables
  editingProductId: string | null = null;
  editingThreshold: number = 10;

  private stockAlertService = inject(StockAlertService);
  private productsService = inject(ProductsService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  constructor() {
    addIcons({ settings, save, alertCircle, checkmarkCircle });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      // Cargar configuración
      this.config = await firstValueFrom(this.stockAlertService.getConfig());

      // Cargar productos
      this.products = await firstValueFrom(this.productsService.getAll());

      // Obtener alertas de stock
      if (this.config) {
        this.productAlerts = await this.stockAlertService.getStockAlerts(
          this.products,
          this.config.defaultThreshold
        );
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      await this.showToast('Error al cargar la configuración', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async saveConfig() {
    if (!this.config) return;

    this.isSaving = true;
    try {
      await this.stockAlertService.saveConfig(this.config);
      await this.showToast('Configuración guardada correctamente', 'success');
      await this.loadData(); // Recargar para actualizar alertas
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      await this.showToast('Error al guardar la configuración', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  async updateProductThreshold(productId: string, threshold: number) {
    try {
      const product = this.products.find((p) => p.id === productId);
      if (!product) return;

      await this.productsService.update(productId, { minStock: threshold });
      await this.showToast('Umbral actualizado correctamente', 'success');
      this.editingProductId = null;
      await this.loadData();
    } catch (error) {
      console.error('Error al actualizar umbral:', error);
      await this.showToast('Error al actualizar el umbral', 'danger');
    }
  }

  startEditing(productId: string, currentThreshold: number) {
    this.editingProductId = productId;
    this.editingThreshold = currentThreshold;
  }

  cancelEditing() {
    this.editingProductId = null;
  }

  async removeProductThreshold(productId: string) {
    const alert = await this.alertController.create({
      header: 'Eliminar umbral personalizado',
      message: '¿Deseas eliminar el umbral personalizado de este producto? Se usará el umbral global.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.productsService.update(productId, { minStock: undefined });
              await this.showToast('Umbral personalizado eliminado', 'success');
              await this.loadData();
            } catch (error) {
              await this.showToast('Error al eliminar el umbral', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  getProductThreshold(product: Product): number {
    if (!this.config) return 10;
    return product.minStock ?? this.config.defaultThreshold;
  }

  get filteredProducts(): Product[] {
    if (!this.searchTerm.trim()) return this.products;
    const search = this.searchTerm.toLowerCase();
    return this.products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  goToProducts() {
    this.router.navigate(['/productos']);
  }
}
