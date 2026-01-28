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

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss'],
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
  ],
})
export class QuickSaleComponent implements OnInit {
  quickSaleForm: FormGroup;
  products: Product[] = [];
  customers: Customer[] = [];
  isLoading = false;
  filteredProducts: Product[] = [];
  productSearchTerm = '';
  showProductResults = false;

  private productsService = inject(ProductsService);
  private customersService = inject(CustomersService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private loadingService = inject(LoadingService);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({ cash });

    this.quickSaleForm = this.fb.group({
      productId: ['', [Validators.required]],
      customerId: [''],
      customerName: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      paymentMethod: ['cash', [Validators.required]],
      discount: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCustomers();
  }

  get selectedProduct(): Product | undefined {
    const id = this.quickSaleForm.get('productId')?.value;
    return this.products.find((p) => p.id === id);
  }

  get unitPrice(): number {
    return this.selectedProduct?.priceSale ?? 0;
  }

  get availableStock(): number {
    return this.selectedProduct?.quantity ?? 0;
  }

  get subtotal(): number {
    const qty = this.quickSaleForm.get('quantity')?.value || 0;
    return this.unitPrice * qty;
  }

  get discount(): number {
    return this.quickSaleForm.get('discount')?.value || 0;
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
        console.error('Error al cargar productos para ventas rápidas:', err);
        this.showToast('Error al cargar productos', 'danger');
      },
    });
  }

  loadCustomers() {
    this.customersService.getAll().subscribe({
      next: (customers) => (this.customers = customers),
      error: (err) => {
        console.error('Error al cargar clientes para ventas rápidas:', err);
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

  selectProduct(product: Product) {
    this.quickSaleForm.patchValue({ productId: product.id });
    this.productSearchTerm = product.name;
    this.filteredProducts = this.products;
    this.showProductResults = false;
  }

  async onSubmit() {
    if (this.quickSaleForm.invalid || !this.selectedProduct) {
      this.quickSaleForm.markAllAsTouched();
      this.showToast('Completa todos los campos requeridos', 'warning');
      return;
    }

    const formValue = this.quickSaleForm.value;
    const product = this.selectedProduct;
    const customer = this.customers.find((c) => c.id === formValue.customerId);
    const manualCustomerName: string = (formValue.customerName || '').trim();
    const quantity = formValue.quantity;

    if (product.quantity < quantity) {
      this.showToast(
        `Stock insuficiente para "${product.name}". Disponible: ${product.quantity}, solicitado: ${quantity}`,
        'danger'
      );
      return;
    }

    this.isLoading = true;
    this.loadingService.show('Registrando venta...');

    try {
      // Resolver datos de cliente:
      // - Si hay nombre escrito manualmente, se usa ese (sin customerId)
      // - Si no, se usa el cliente seleccionado del listado (id + name)
      const resolvedCustomerId = manualCustomerName ? undefined : customer?.id;
      const resolvedCustomerName = manualCustomerName || customer?.name;

      await this.salesService.createSaleAndUpdateStock({
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName,
        items: [
          {
            productId: product.id!,
            productName: product.name,
            quantity,
            priceUnit: product.priceSale,
            total: product.priceSale * quantity,
          },
        ],
        subtotal: this.subtotal,
        discount: this.discount,
        total: this.total,
        paymentMethod: formValue.paymentMethod,
        status: 'completed',
      });

      this.showToast('Venta registrada correctamente', 'success');

      // resetear formulario (mantener método de pago en último valor)
      this.quickSaleForm.reset({
        productId: '',
        customerId: '',
        customerName: '',
        quantity: 1,
        paymentMethod: formValue.paymentMethod,
        discount: 0,
      });
    } catch (error: any) {
      console.error('Error al registrar venta rápida:', error);
      this.showToast(error?.message || 'Error al registrar la venta', 'danger');
    } finally {
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value || 0);
  }

  increaseQuantity() {
    const current = this.quickSaleForm.get('quantity')?.value || 1;
    this.quickSaleForm.patchValue({ quantity: current + 1 });
  }

  decreaseQuantity() {
    const current = this.quickSaleForm.get('quantity')?.value || 1;
    const next = Math.max(1, current - 1);
    this.quickSaleForm.patchValue({ quantity: next });
  }

  setPaymentMethod(method: 'cash' | 'card' | 'transfer' | 'other') {
    this.quickSaleForm.patchValue({ paymentMethod: method });
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

