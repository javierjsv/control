import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonMenuButton,
  IonButtons,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonList,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cash } from 'ionicons/icons';
import { ProductsService } from '../../services/products.service';
import { CustomersService } from '../../services/customers.service';
import { SalesService } from '../../services/sales.service';
import { Product } from '../../core/interfaces/product.interfaces';
import { Customer } from '../../core/interfaces/customer.interfaces';
import { LoadingService } from '../../core/services/loading.service';
import { ToastController } from '@ionic/angular';
import { SaleItem } from '../../core/interfaces/sale.interfaces';
import { ReceiptComponent } from '../receipt/receipt.component';

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-full-sale',
  standalone: true,
  templateUrl: './full-sale.component.html',
  styleUrls: ['./full-sale.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonMenuButton,
    IonButtons,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonList,
    IonModal,
    ReceiptComponent,
  ],
})
export class FullSaleComponent implements OnInit {
  saleForm: FormGroup;
  products: Product[] = [];
  customers: Customer[] = [];
  cartItems: CartItem[] = [];

  filteredProducts: Product[] = [];
  productSearchTerm = '';
  showProductResults = false;
  isLoading = false;
  showReceiptModal = false;
  lastSaleId: string | null = null;
  lastCustomerPhone: string | null = null;
  lastCustomerEmail: string | null = null;

  private productsService = inject(ProductsService);
  private customersService = inject(CustomersService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private loadingService = inject(LoadingService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ cash });

    this.saleForm = this.fb.group({
      customerId: [''],
      customerName: [''],
      paymentMethod: ['cash', [Validators.required]],
      discount: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCustomers();
  }

  get subtotal(): number {
    return this.cartItems.reduce(
      (acc, item) => acc + item.product.priceSale * item.quantity,
      0
    );
  }

  get discount(): number {
    return this.saleForm.get('discount')?.value || 0;
  }

  get total(): number {
    return Math.max(this.subtotal - this.discount, 0);
  }

  loadProducts() {
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
      },
      error: (err) => {
        console.error('Error al cargar productos para venta completa:', err);
        this.showToast('Error al cargar productos', 'danger');
      },
    });
  }

  loadCustomers() {
    this.customersService.getAll().subscribe({
      next: (customers) => (this.customers = customers),
      error: (err) => {
        console.error('Error al cargar clientes para venta completa:', err);
        this.showToast('Error al cargar clientes', 'danger');
      },
    });
  }

  onProductSearchChange(event: CustomEvent) {
    const term = ((event.detail.value as string) || '').toLowerCase().trim();
    this.productSearchTerm = term;

    if (!term) {
      this.filteredProducts = this.products;
      this.showProductResults = false;
      return;
    }

    this.filteredProducts = this.products.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
    this.showProductResults = this.filteredProducts.length > 0;
  }

  addProductToCart(product: Product) {
    const existing = this.cartItems.find((ci) => ci.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems.push({ product, quantity: 1 });
    }
    // Limpiar el buscador para facilitar una nueva búsqueda
    this.productSearchTerm = '';
    this.showProductResults = false;
  }

  increaseItemQuantity(item: CartItem) {
    item.quantity += 1;
  }

  decreaseItemQuantity(item: CartItem) {
    item.quantity = Math.max(1, item.quantity - 1);
  }

  removeItem(item: CartItem) {
    this.cartItems = this.cartItems.filter((ci) => ci !== item);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  }

  setPaymentMethod(method: 'cash' | 'card' | 'transfer' | 'other') {
    this.saleForm.patchValue({ paymentMethod: method });
  }

  async onSubmit() {
    if (this.cartItems.length === 0) {
      this.showToast('Agrega al menos un producto al carrito', 'warning');
      return;
    }

    const formValue = this.saleForm.value;

    // Validar stock disponible por producto
    for (const item of this.cartItems) {
      const available = item.product.quantity ?? 0;
      if (item.quantity > available) {
        this.showToast(
          `Stock insuficiente para "${item.product.name}". Disponible: ${available}, solicitado: ${item.quantity}`,
          'danger'
        );
        return;
      }
    }

    this.isLoading = true;
    this.loadingService.show('Registrando venta...');

    try {
      const customer = this.customers.find((c) => c.id === formValue.customerId);
      const manualCustomerName: string = (formValue.customerName || '').trim();

      const resolvedCustomerId = manualCustomerName ? undefined : customer?.id;
      const resolvedCustomerName = manualCustomerName || customer?.name;

      const items: SaleItem[] = this.cartItems.map((ci) => ({
        productId: ci.product.id!,
        productName: ci.product.name,
        quantity: ci.quantity,
        priceUnit: ci.product.priceSale,
        total: ci.product.priceSale * ci.quantity,
      }));

      const saleId = await this.salesService.createSaleAndUpdateStock({
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        items,
        subtotal: this.subtotal,
        discount: this.discount,
        total: this.total,
        paymentMethod: formValue.paymentMethod,
        status: 'completed',
      });

      this.showToast('Venta registrada correctamente', 'success');

      this.lastSaleId = saleId;
      this.lastCustomerPhone = customer?.phone ?? null;
      this.lastCustomerEmail = customer?.email ?? null;
      this.showReceiptModal = true;

      this.cartItems = [];
      this.saleForm.reset({
        customerId: '',
        customerName: '',
        paymentMethod: formValue.paymentMethod,
        discount: 0,
      });
    } catch (error: any) {
      console.error('Error al registrar venta completa:', error);
      this.showToast(error?.message || 'Error al registrar la venta', 'danger');
    } finally {
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}

