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
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search, download, cloudUpload } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import { ProductsService } from '../../../services/products.service';
import { CategoriesService } from '../../../services/categories.service';
import { ProveedoresService } from '../../../services/proveedores.service';
import { Product } from '../../../core/interfaces/product.interfaces';
import { Category } from '../../../core/interfaces/category.interfaces';
import { Proveedor } from '../../../core/interfaces/proveedor.interfaces';
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
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption,
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
  categories: Category[] = [];
  proveedores: Proveedor[] = [];
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
  private categoriesService = inject(CategoriesService);
  private proveedoresService = inject(ProveedoresService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search, download, cloudUpload });
    
    // Función helper para parsear números formateados (sin usar this)
    const parseFormattedNumberHelper = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      if (typeof value === 'number') {
        return Math.floor(value);
      }
      const cleanedValue = String(value).replace(/\./g, '').trim();
      const numValue = parseFloat(cleanedValue);
      return isNaN(numValue) ? 0 : Math.floor(numValue);
    };

    // Validador personalizado para campos de precio formateados
    const priceValidator = (control: any) => {
      if (!control.value || control.value === '') {
        return null; // Permitir vacío para campos opcionales
      }
      const numValue = parseFormattedNumberHelper(control.value);
      return numValue >= 0 ? null : { min: { min: 0, actual: numValue } };
    };

    const requiredPriceValidator = (control: any) => {
      if (!control.value || control.value === '') {
        return { required: true };
      }
      const numValue = parseFormattedNumberHelper(control.value);
      if (numValue < 0) {
        return { min: { min: 0, actual: numValue } };
      }
      return null;
    };

    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', [Validators.required]],
      priceBuy: ['', [priceValidator]],
      priceOffer: ['', [priceValidator]],
      image: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      features: ['', [Validators.required]], // Se guardará como string y se convertirá a array
      rating: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
      reviews: [0, [Validators.required, Validators.min(0)]],
      inStock: [true],
      hotSale: [false],
      supplier: ['', [Validators.required]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      priceSale: ['', [requiredPriceValidator]]
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadProveedores();
  }

  loadCategories() {
    this.categoriesService.getAll().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  loadProveedores() {
    this.proveedoresService.getAll().subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
      }
    });
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

  async doRefresh(event: any) {
    try {
      // Resetear paginación
      this.pageIndex = 0;
      this.lastDoc = null;
      this.hasMore = true;
      
      // Recargar productos desde el inicio
      await this.loadProducts();
      
      // Completar el refresh
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar productos:', error);
      this.showToast('Error al actualizar productos', 'danger');
      event.target.complete();
    }
  }

  /**
   * Exporta los productos a un archivo Excel (.xlsx)
   */
  exportToExcel() {
    try {
      // Preparar los datos para Excel
      const dataToExport = this.products.map((product, index) => ({
        'N°': index + 1,
        'Nombre': product.name || '',
        'Categoría': product.category || '',
        'Precio Compra': product.priceBuy || '',
        'Precio Venta': product.priceSale || 0,
        'Precio Oferta': product.priceOffer || 0,
        'Descripción': product.description || '',
        'Características': product.features ? product.features.join(', ') : '',
        'Rating': product.rating || 0,
        'Reviews': product.reviews || 0,
        'En Stock': product.inStock ? 'Sí' : 'No',
        'Hot Sale': product.hotSale ? 'Sí' : 'No',
        'URL Imagen': product.image || ''
      }));

      // Crear el libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 5 },   // N°
        { wch: 30 },  // Nombre
        { wch: 20 },  // Categoría
        { wch: 15 },  // Precio Compra
        { wch: 15 },  // Precio Venta
        { wch: 15 },  // Precio Oferta
        { wch: 50 },  // Descripción
        { wch: 40 },  // Características
        { wch: 8 },   // Rating
        { wch: 10 },  // Reviews
        { wch: 10 },  // En Stock
        { wch: 10 },  // Hot Sale
        { wch: 50 }   // URL Imagen
      ];
      worksheet['!cols'] = columnWidths;

      // Generar el archivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Crear el blob y descargar
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      link.download = `productos_${fecha}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.showToast(`Se exportaron ${this.products.length} productos correctamente`, 'success');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.showToast('Error al exportar los productos a Excel', 'danger');
    }
  }

  /**
   * Abre el selector de archivos para importar Excel
   */
  triggerFileInput() {
    const fileInput = document.getElementById('excel-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Maneja la selección del archivo Excel para importar
   */
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validar que sea un archivo Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.showToast('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'danger');
      input.value = '';
      return;
    }

    try {
      this.loadingService.show('Leyendo archivo Excel...');
      
      // Leer el archivo
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Obtener la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir a JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      
      if (!data || data.length === 0) {
        this.loadingService.hide();
        this.showToast('El archivo Excel está vacío o no tiene datos', 'danger');
        input.value = '';
        return;
      }

      // Validar y procesar los datos
      await this.processExcelData(data);
      
      input.value = '';
    } catch (error) {
      console.error('Error al leer el archivo Excel:', error);
      this.loadingService.hide();
      this.showToast('Error al leer el archivo Excel. Verifica que el archivo no esté corrupto.', 'danger');
      input.value = '';
    }
  }

  /**
   * Procesa y valida los datos del Excel
   */
  async processExcelData(data: any[]) {
    try {
      // Columnas requeridas
      const requiredColumns = ['Nombre', 'Categoría', 'Descripción', 'URL Imagen', 'Características'];
      const optionalColumns = ['Precio Compra', 'Precio Venta', 'Precio Oferta', 'Rating', 'Reviews', 'En Stock', 'Hot Sale'];
      
      // Validar que existan las columnas requeridas
      const firstRow = data[0];
      const missingColumns: string[] = [];
      
      for (const col of requiredColumns) {
        if (!(col in firstRow)) {
          missingColumns.push(col);
        }
      }

      if (missingColumns.length > 0) {
        this.loadingService.hide();
        this.showToast(
          `El archivo Excel no tiene las columnas requeridas: ${missingColumns.join(', ')}. ` +
          `Las columnas requeridas son: ${requiredColumns.join(', ')}`,
          'danger'
        );
        return;
      }

      // Validar y crear productos
      const productsToCreate: Omit<Product, 'id'>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque empieza en 1 y la primera fila es el header

        try {
          // Validar datos requeridos
          const name = String(row['Nombre'] || '').trim();
          const category = String(row['Categoría'] || '').trim();
          const description = String(row['Descripción'] || '').trim();
          const image = String(row['URL Imagen'] || '').trim();
          const featuresStr = String(row['Características'] || '').trim();

          // Validaciones
          if (!name || name.length < 3) {
            errors.push(`Fila ${rowNumber}: El nombre es requerido y debe tener al menos 3 caracteres`);
            continue;
          }

          if (!category) {
            errors.push(`Fila ${rowNumber}: La categoría es requerida`);
            continue;
          }

          if (!description) {
            errors.push(`Fila ${rowNumber}: La descripción es requerida`);
            continue;
          }

          if (!image) {
            errors.push(`Fila ${rowNumber}: La URL de la imagen es requerida`);
            continue;
          }

          // Validar formato de URL
          try {
            new URL(image);
          } catch {
            errors.push(`Fila ${rowNumber}: La URL de la imagen no es válida`);
            continue;
          }

          if (!featuresStr) {
            errors.push(`Fila ${rowNumber}: Las características son requeridas`);
            continue;
          }

          // Procesar características (separadas por comas)
          const features = featuresStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
          if (features.length === 0) {
            errors.push(`Fila ${rowNumber}: Debe haber al menos una característica`);
            continue;
          }

          // Datos opcionales
          const priceBuyStr = row['Precio Compra'] ? String(row['Precio Compra']).trim() : '';
          const priceBuy = priceBuyStr ? (isNaN(parseFloat(priceBuyStr)) ? undefined : parseFloat(priceBuyStr)) : undefined;

          const ratingStr = row['Rating'] ? String(row['Rating']).trim() : '';
          const rating = ratingStr ? (isNaN(parseFloat(ratingStr)) ? 0 : Math.max(0, Math.min(5, parseFloat(ratingStr)))) : 0;

          const reviewsStr = row['Reviews'] ? String(row['Reviews']).trim() : '';
          const reviews = reviewsStr ? (isNaN(parseInt(reviewsStr)) ? 0 : parseInt(reviewsStr)) : 0;

          const inStockStr = row['En Stock'] ? String(row['En Stock']).trim().toLowerCase() : 'sí';
          const inStock = inStockStr === 'sí' || inStockStr === 'si' || inStockStr === 'yes' || inStockStr === 'true' || inStockStr === '1';

          const hotSaleStr = row['Hot Sale'] ? String(row['Hot Sale']).trim().toLowerCase() : '';
          const hotSale = hotSaleStr === 'sí' || hotSaleStr === 'si' || hotSaleStr === 'yes' || hotSaleStr === 'true' || hotSaleStr === '1';

          // Campos adicionales requeridos
          const supplierStr = row['Proveedor'] ? String(row['Proveedor']).trim() : '';
          const supplier = supplierStr || '';
          
          const quantityStr = row['Cantidad'] ? String(row['Cantidad']).trim() : '0';
          const quantity = isNaN(parseInt(quantityStr)) ? 0 : parseInt(quantityStr);
          
          const priceSaleStr = row['Precio Venta'] ? String(row['Precio Venta']).trim() : '0';
          const priceSale = isNaN(parseFloat(priceSaleStr)) ? 0 : parseFloat(priceSaleStr);

          // Crear objeto producto
          const productData: Omit<Product, 'id'> = {
            name,
            category,
            description,
            image,
            features,
            rating,
            reviews,
            inStock,
            supplier,
            quantity,
            priceSale
          };

          // Solo incluir priceOffer si tiene un valor válido
          const priceOfferStr = row['Precio Oferta'] ? String(row['Precio Oferta']).trim() : '';
          if (priceOfferStr && !isNaN(parseFloat(priceOfferStr))) {
            const priceOffer = parseFloat(priceOfferStr);
            if (priceOffer > 0) {
              productData.priceOffer = priceOffer;
            }
          }

          if (priceBuy !== undefined && priceBuy > 0) {
            productData.priceBuy = priceBuy;
          }

          if (hotSale) {
            productData.hotSale = true;
          }

          productsToCreate.push(productData);
        } catch (error) {
          errors.push(`Fila ${rowNumber}: Error al procesar los datos - ${error}`);
        }
      }

      // Mostrar errores si los hay
      if (errors.length > 0) {
        this.loadingService.hide();
        const errorMessage = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... y ${errors.length - 5} errores más` : '');
        
        const alert = await this.alertController.create({
          header: 'Errores de validación',
          message: `Se encontraron ${errors.length} error(es) en el archivo:\n\n${errorMessage}\n\n¿Deseas continuar con los registros válidos?`,
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel'
            },
            {
              text: 'Continuar',
              handler: async () => {
                await this.createProductsFromExcel(productsToCreate);
              }
            }
          ]
        });
        await alert.present();
        return;
      }

      // Si no hay errores, crear todos los productos
      await this.createProductsFromExcel(productsToCreate);

    } catch (error) {
      console.error('Error al procesar datos del Excel:', error);
      this.loadingService.hide();
      this.showToast('Error al procesar los datos del Excel', 'danger');
    }
  }

  /**
   * Crea los productos en Firestore
   */
  async createProductsFromExcel(products: Omit<Product, 'id'>[]) {
    if (products.length === 0) {
      this.loadingService.hide();
      this.showToast('No hay productos válidos para crear', 'warning');
      return;
    }

    try {
      this.loadingService.show(`Creando ${products.length} producto(s)...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const product of products) {
        try {
          await this.productsService.create(product);
          successCount++;
        } catch (error) {
          console.error('Error al crear producto:', error);
          errorCount++;
        }
      }

      this.loadingService.hide();

      if (successCount > 0) {
        this.showToast(
          `Se importaron ${successCount} producto(s) correctamente${errorCount > 0 ? `. ${errorCount} error(es)` : ''}`,
          successCount === products.length ? 'success' : 'warning'
        );
        
        // Recargar la lista
        await this.loadProducts();
      } else {
        this.showToast('No se pudo importar ningún producto', 'danger');
      }
    } catch (error) {
      console.error('Error al crear productos:', error);
      this.loadingService.hide();
      this.showToast('Error al crear los productos', 'danger');
    }
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
        priceBuy: product.priceBuy || 0,
        priceOffer: product.priceOffer || 0,
        image: product.image,
        description: product.description,
        features: product.features.join(', '), // Convertir array a string separado por comas
        rating: product.rating,
        reviews: product.reviews,
        inStock: product.inStock,
        hotSale: product.hotSale || false,
        supplier: product.supplier || '',
        quantity: product.quantity || 0,
        priceSale: product.priceSale || 0
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
        priceBuy: '',
        priceOffer: '',
        supplier: '',
        quantity: 0,
        priceSale: '',
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

      // Convertir valores formateados a números enteros
      const priceSale = this.parseFormattedNumber(formValue.priceSale);
      const priceBuy = this.parseFormattedNumber(formValue.priceBuy);
      const priceOffer = this.parseFormattedNumber(formValue.priceOffer);

      // Construir el objeto de producto, excluyendo campos undefined
      const productData: Omit<Product, 'id'> = {
        name: formValue.name,
        category: formValue.category,
        image: formValue.image,
        description: formValue.description,
        features: featuresArray,
        rating: formValue.rating,
        reviews: formValue.reviews,
        inStock: formValue.inStock,
        hotSale: formValue.hotSale || false,
        supplier: formValue.supplier,
        quantity: formValue.quantity,
        priceSale: priceSale
      };

      // Solo incluir priceBuy si tiene un valor mayor a 0
      if (priceBuy > 0) {
        productData.priceBuy = priceBuy;
      }

      // Incluir priceOffer siempre que tenga un valor (incluso si es 0, para permitir actualizaciones)
      // Si es undefined o null, no se incluye (mantiene el valor existente o lo deja opcional)
      if (priceOffer !== undefined && priceOffer !== null && priceOffer >= 0) {
        productData.priceOffer = priceOffer;
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

  /**
   * Formatea un número con separadores de miles (ej: 2500 -> "2.500")
   */
  formatNumberWithThousands(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    // Convertir a número y eliminar decimales
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value;
    if (isNaN(numValue)) {
      return '';
    }
    // Formatear con separadores de miles
    return Math.floor(numValue).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /**
   * Convierte un string formateado con separadores de miles a número entero (ej: "2.500" -> 2500)
   */
  parseFormattedNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number') {
      return Math.floor(value);
    }
    // Eliminar puntos (separadores de miles) y convertir a número
    const cleanedValue = String(value).replace(/\./g, '').trim();
    const numValue = parseFloat(cleanedValue);
    return isNaN(numValue) ? 0 : Math.floor(numValue);
  }

  /**
   * Maneja el evento de input para formatear el número con separadores de miles
   */
  onPriceInput(event: any, fieldName: 'priceBuy' | 'priceSale' | 'priceOffer') {
    const inputValue = event.detail.value || '';
    // Eliminar todos los caracteres que no sean dígitos
    const numericValue = inputValue.replace(/\D/g, '');
    
    if (numericValue === '') {
      this.productForm.patchValue({ [fieldName]: '' }, { emitEvent: false });
      return;
    }

    // Convertir a número y formatear
    const numValue = parseInt(numericValue, 10);
    const formattedValue = this.formatNumberWithThousands(numValue);
    
    // Actualizar el valor del formulario sin disparar eventos
    this.productForm.patchValue({ [fieldName]: formattedValue }, { emitEvent: false });
  }
}
