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
import { add, create, trash, close, checkmark, search, download, cloudUpload } from 'ionicons/icons';
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
    addIcons({ add, create, trash, close, checkmark, search, download, cloudUpload });
    
    this.proveedorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required]],
      company: [''],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required]],
      description: [''], // Campo opcional
      webSite: [''] // Campo opcional
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
      const requiredColumns = ['Nombre', 'Ciudad', 'Teléfono', 'Email', 'Dirección'];
      const optionalColumns = ['Empresa', 'Descripción'];
      
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

      // Validar y crear proveedores
      const proveedoresToCreate: Omit<Proveedor, 'id' | 'createdAt'>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2; // +2 porque empieza en 1 y la primera fila es el header

        try {
          // Validar datos requeridos
          const name = String(row['Nombre'] || '').trim();
          const city = String(row['Ciudad'] || '').trim();
          const phone = String(row['Teléfono'] || '').trim();
          const email = String(row['Email'] || '').trim();
          const address = String(row['Dirección'] || '').trim();

          // Validaciones
          if (!name || name.length < 3) {
            errors.push(`Fila ${rowNumber}: El nombre es requerido y debe tener al menos 3 caracteres`);
            continue;
          }

          if (!city) {
            errors.push(`Fila ${rowNumber}: La ciudad es requerida`);
            continue;
          }

          if (!phone) {
            errors.push(`Fila ${rowNumber}: El teléfono es requerido`);
            continue;
          }

          // Validar formato de teléfono (solo números y guiones)
          if (!/^[0-9-]+$/.test(phone)) {
            errors.push(`Fila ${rowNumber}: El teléfono solo debe contener números y guiones (-)`);
            continue;
          }

          if (!email) {
            errors.push(`Fila ${rowNumber}: El email es requerido`);
            continue;
          }

          // Validar formato de email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Fila ${rowNumber}: El email no tiene un formato válido`);
            continue;
          }

          if (!address) {
            errors.push(`Fila ${rowNumber}: La dirección es requerida`);
            continue;
          }

          // Datos opcionales
          const company = row['Empresa'] ? String(row['Empresa']).trim() : undefined;
          const description = row['Descripción'] ? String(row['Descripción']).trim() : undefined;

          // Crear objeto proveedor
          const proveedorData: Omit<Proveedor, 'id' | 'createdAt'> = {
            name,
            city,
            phone,
            email,
            address
          };

          if (company && company.length > 0) {
            proveedorData.company = company;
          }

          if (description && description.length > 0) {
            proveedorData.description = description;
          }

          proveedoresToCreate.push(proveedorData);
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
                await this.createProveedoresFromExcel(proveedoresToCreate);
              }
            }
          ]
        });
        await alert.present();
        return;
      }

      // Si no hay errores, crear todos los proveedores
      await this.createProveedoresFromExcel(proveedoresToCreate);

    } catch (error) {
      console.error('Error al procesar datos del Excel:', error);
      this.loadingService.hide();
      this.showToast('Error al procesar los datos del Excel', 'danger');
    }
  }

  /**
   * Crea los proveedores en Firestore
   */
  async createProveedoresFromExcel(proveedores: Omit<Proveedor, 'id' | 'createdAt'>[]) {
    if (proveedores.length === 0) {
      this.loadingService.hide();
      this.showToast('No hay proveedores válidos para crear', 'warning');
      return;
    }

    try {
      this.loadingService.show(`Creando ${proveedores.length} proveedor(es)...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const proveedor of proveedores) {
        try {
          await this.proveedoresService.create(proveedor);
          successCount++;
        } catch (error) {
          console.error('Error al crear proveedor:', error);
          errorCount++;
        }
      }

      this.loadingService.hide();

      if (successCount > 0) {
        this.showToast(
          `Se importaron ${successCount} proveedor(es) correctamente${errorCount > 0 ? `. ${errorCount} error(es)` : ''}`,
          successCount === proveedores.length ? 'success' : 'warning'
        );
        
        // Recargar la lista
        await this.loadProveedores();
      } else {
        this.showToast('No se pudo importar ningún proveedor', 'danger');
      }
    } catch (error) {
      console.error('Error al crear proveedores:', error);
      this.loadingService.hide();
      this.showToast('Error al crear los proveedores', 'danger');
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
        description: proveedor.description || '',
        webSite: proveedor.webSite || ''
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
        webSite: '',
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

      // Solo incluir webSite si tiene un valor
      if (formValue.webSite && formValue.webSite.trim() !== '') {
        proveedorData.webSite = formValue.webSite.trim();
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
