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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonModal,
  IonInput,
  IonTextarea,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search, download } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import { ProveedoresService } from '../../services/proveedores.service';
import { Proveedor } from '../../core/interfaces/proveedor.interfaces';
import { LoadingService } from '../../core/services/loading.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss'],
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonModal,
    IonInput,
    IonTextarea,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    MatPaginatorModule
  ],
})
export class ProveedoresComponent implements OnInit, OnDestroy {
  proveedores: Proveedor[] = [];
  filteredProveedores: Proveedor[] = [];
  proveedorForm: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingProveedorId: string | null = null;
  isLoading = false;
  formSubmitted = false;
  searchTerm: string = '';
  private proveedoresSubscription?: Subscription;
  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  hasMore = true;
  isLoadingMore = false;
  
  // Paginación para tabla
  paginatedProveedores: Proveedor[] = [];
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems = 0;

  private proveedoresService = inject(ProveedoresService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search, download });
    
    this.proveedorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required]],
      company: [''],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required]],
      description: [''] // Campo opcional
    });
  }

  ngOnInit() {
    this.loadProveedores();
  }

  ngOnDestroy() {
    if (this.proveedoresSubscription) {
      this.proveedoresSubscription.unsubscribe();
    }
  }

  async loadProveedores() {
    this.isLoading = true;
    this.loadingService.show('Cargando proveedores...');
    try {
      const result = await this.proveedoresService.getPaginated();
      this.proveedores = result.proveedores;
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.updatePaginatedProveedores();
      this.isLoading = false;
      this.loadingService.hide();
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      this.showToast('Error al cargar proveedores', 'danger');
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  async loadMoreProveedores(event: any) {
    if (!this.lastDoc || !this.hasMore || this.isLoadingMore || this.searchTerm) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = await this.proveedoresService.loadMore(this.lastDoc);
      this.proveedores = [...this.proveedores, ...result.proveedores];
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.isLoadingMore = false;
      event.target.complete();
      
      if (!this.hasMore) {
        event.target.disabled = true;
      }
    } catch (error) {
      console.error('Error al cargar más proveedores:', error);
      this.showToast('Error al cargar más proveedores', 'danger');
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  onSearchChange(event: CustomEvent) {
    this.searchTerm = (event.detail.value as string) || '';
    this.applyFilter();
  }

  onPhoneInput(event: CustomEvent) {
    const input = event.target as HTMLInputElement;
    const value = input.value || '';
    // Filtrar solo números y guiones
    const filteredValue = value.replace(/[^0-9-]/g, '');
    
    // Actualizar el valor del input y del formulario
    if (value !== filteredValue) {
      input.value = filteredValue;
      this.proveedorForm.patchValue({ phone: filteredValue }, { emitEvent: false });
    }
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredProveedores = this.proveedores;
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredProveedores = this.proveedores.filter(proveedor =>
        proveedor.name.toLowerCase().includes(searchLower)
      );
    }
    this.updatePaginatedProveedores();
  }

  updatePaginatedProveedores() {
    this.totalItems = this.filteredProveedores.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProveedores = this.filteredProveedores.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedProveedores();
  }

  async doRefresh(event: any) {
    try {
      // Resetear paginación
      this.pageIndex = 0;
      this.lastDoc = null;
      this.hasMore = true;
      
      // Recargar proveedores desde el inicio
      await this.loadProveedores();
      
      // Completar el refresh
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar proveedores:', error);
      this.showToast('Error al actualizar proveedores', 'danger');
      event.target.complete();
    }
  }

  /**
   * Genera el enlace tel: para realizar llamadas desde dispositivos móviles
   * @param phone Número de teléfono
   * @returns URL con protocolo tel:
   */
  getPhoneLink(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') return '#';
    // Remover guiones y espacios para el enlace tel:
    const cleanPhone = phone.replace(/[-\s]/g, '');
    return `tel:${cleanPhone}`;
  }

  /**
   * Maneja el clic en el teléfono para abrir la aplicación de llamadas
   * @param phone Número de teléfono
   */
  callPhone(phone: string | null | undefined, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (phone && typeof phone === 'string') {
      const cleanPhone = phone.replace(/[-\s]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  }

  /**
   * Exporta los proveedores a un archivo Excel (.xlsx)
   */
  exportToExcel() {
    console.log('exportToExcel');
    try {
      // Preparar los datos para Excel
      const dataToExport = this.proveedores.map((proveedor, index) => ({
        'N°': index + 1,
        'Nombre': proveedor.name || '',
        'Ciudad': proveedor.city || '',
        'Empresa': proveedor.company || '',
        'Teléfono': proveedor.phone || '',
        'Email': proveedor.email || '',
        'Dirección': proveedor.address || '',
        'Descripción': proveedor.description || ''
      }));

      // Crear el libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');

      // Ajustar el ancho de las columnas
      const columnWidths = [
        { wch: 5 },   // N°
        { wch: 25 },  // Nombre
        { wch: 15 },  // Ciudad
        { wch: 20 },  // Empresa
        { wch: 15 },  // Teléfono
        { wch: 30 },  // Email
        { wch: 40 },  // Dirección
        { wch: 50 }   // Descripción
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
      link.download = `proveedores_${fecha}.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.showToast(`Se exportaron ${this.proveedores.length} proveedores correctamente`, 'success');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.showToast('Error al exportar los proveedores a Excel', 'danger');
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  openModal(proveedor?: Proveedor) {
    // Resetear el formulario y su estado
    this.formSubmitted = false;
    this.proveedorForm.reset();
    
    // Marcar todos los controles como untouched
    Object.keys(this.proveedorForm.controls).forEach(key => {
      this.proveedorForm.get(key)?.markAsUntouched();
      this.proveedorForm.get(key)?.markAsPristine();
    });
    
    if (proveedor) {
      // Modo edición
      this.isEditing = true;
      this.editingProveedorId = proveedor.id || null;
      this.proveedorForm.patchValue({
        name: proveedor.name,
        city: proveedor.city,
        company: proveedor.company || '',
        phone: proveedor.phone,
        email: proveedor.email,
        address: proveedor.address,
        description: proveedor.description || ''
      }, { emitEvent: false });
      
      // Marcar como pristine y untouched después de cargar los valores
      Object.keys(this.proveedorForm.controls).forEach(key => {
        this.proveedorForm.get(key)?.markAsUntouched();
        this.proveedorForm.get(key)?.markAsPristine();
      });
    } else {
      // Modo creación
      this.isEditing = false;
      this.editingProveedorId = null;
      this.proveedorForm.reset({
        name: '',
        city: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        description: ''
      }, { emitEvent: false });
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.formSubmitted = false;
    this.proveedorForm.reset();
    Object.keys(this.proveedorForm.controls).forEach(key => {
      this.proveedorForm.get(key)?.markAsUntouched();
      this.proveedorForm.get(key)?.markAsPristine();
    });
    this.isEditing = false;
    this.editingProveedorId = null;
  }

  async saveProveedor() {
    this.formSubmitted = true;
    
    if (this.proveedorForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.proveedorForm.controls).forEach(key => {
        this.proveedorForm.get(key)?.markAsTouched();
      });
      this.showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    this.loadingService.show(this.isEditing ? 'Actualizando proveedor...' : 'Creando proveedor...');

    try {
      const formValue = this.proveedorForm.value;
      
      // Construir el objeto de proveedor
      const proveedorData: Omit<Proveedor, 'id' | 'createdAt'> = {
        name: formValue.name,
        city: formValue.city,
        phone: formValue.phone,
        email: formValue.email,
        address: formValue.address
      };

      // Solo incluir company si tiene un valor
      if (formValue.company && formValue.company.trim() !== '') {
        proveedorData.company = formValue.company.trim();
      }

      // Solo incluir description si tiene un valor
      if (formValue.description && formValue.description.trim() !== '') {
        proveedorData.description = formValue.description.trim();
      }

      if (this.isEditing && this.editingProveedorId) {
        await this.proveedoresService.update(this.editingProveedorId, proveedorData);
        this.showToast('Proveedor actualizado correctamente', 'success');
      } else {
        await this.proveedoresService.create(proveedorData);
        this.showToast('Proveedor creado correctamente', 'success');
      }

      // Recargar proveedores y aplicar filtro
      await this.loadProveedores();
      this.closeModal();
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      this.showToast('Error al guardar el proveedor', 'danger');
      this.loadingService.hide();
    } finally {
      this.loadingService.hide();
    }
  }

  async deleteProveedor(proveedor: Proveedor) {
    if (!proveedor.id) {
      this.showToast('Error: ID del proveedor no encontrado', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar el proveedor "${proveedor.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.loadingService.show('Eliminando proveedor...');

            try {
              await this.proveedoresService.delete(proveedor.id!);
              this.showToast('Proveedor eliminado correctamente', 'success');
              // Recargar proveedores y aplicar filtro
              await this.loadProveedores();
            } catch (error) {
              console.error('Error al eliminar proveedor:', error);
              this.showToast('Error al eliminar el proveedor', 'danger');
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
