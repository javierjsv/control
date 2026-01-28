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
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search, download, cloudUpload } from 'ionicons/icons';
import * as XLSX from 'xlsx';
import { CustomersService } from '../../services/customers.service';
import { Customer } from '../../core/interfaces/customer.interfaces';
import { LoadingService } from '../../core/services/loading.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
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
    MatPaginatorModule,
  ],
})
export class CustomersComponent implements OnInit, OnDestroy {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  customerForm: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingCustomerId: string | null = null;
  isLoading = false;
  formSubmitted = false;
  searchTerm: string = '';
  private customersSubscription?: Subscription;
  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  hasMore = true;
  isLoadingMore = false;

  // Paginación para tabla
  paginatedCustomers: Customer[] = [];
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems = 0;

  private customersService = inject(CustomersService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search, download, cloudUpload });

    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9-]+$/)]],
      email: ['', [Validators.email]],
      address: [''],
      description: [''],
    });
  }

  ngOnInit() {
    this.loadCustomers();
  }

  ngOnDestroy() {
    if (this.customersSubscription) {
      this.customersSubscription.unsubscribe();
    }
  }

  async loadCustomers() {
    this.isLoading = true;
    this.loadingService.show('Cargando clientes...');
    try {
      const result = await this.customersService.getPaginated();
      this.customers = result.customers;
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.updatePaginatedCustomers();
      this.isLoading = false;
      this.loadingService.hide();
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      this.showToast('Error al cargar clientes', 'danger');
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  async loadMoreCustomers(event: any) {
    if (!this.lastDoc || !this.hasMore || this.isLoadingMore || this.searchTerm) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = await this.customersService.loadMore(this.lastDoc);
      this.customers = [...this.customers, ...result.customers];
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.isLoadingMore = false;
      event.target.complete();

      if (!this.hasMore) {
        event.target.disabled = true;
      }
    } catch (error) {
      console.error('Error al cargar más clientes:', error);
      this.showToast('Error al cargar más clientes', 'danger');
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
    const filteredValue = value.replace(/[^0-9-]/g, '');

    if (value !== filteredValue) {
      input.value = filteredValue;
      this.customerForm.patchValue({ phone: filteredValue }, { emitEvent: false });
    }
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredCustomers = this.customers;
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredCustomers = this.customers.filter((c) => c.name.toLowerCase().includes(searchLower));
    }
    this.updatePaginatedCustomers();
  }

  updatePaginatedCustomers() {
    this.totalItems = this.filteredCustomers.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCustomers = this.filteredCustomers.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedCustomers();
  }

  async doRefresh(event: any) {
    try {
      this.pageIndex = 0;
      this.lastDoc = null;
      this.hasMore = true;

      await this.loadCustomers();
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar clientes:', error);
      this.showToast('Error al actualizar clientes', 'danger');
      event.target.complete();
    }
  }

  getPhoneLink(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') return '#';
    const cleanPhone = phone.replace(/[-\s]/g, '');
    return `tel:${cleanPhone}`;
  }

  callPhone(phone: string | null | undefined, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (phone && typeof phone === 'string') {
      const cleanPhone = phone.replace(/[-\s]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  }

  exportToExcel() {
    try {
      const dataToExport = this.customers.map((customer, index) => ({
        'N°': index + 1,
        'Nombre': customer.name || '',
        'Ciudad': customer.city || '',
        'Teléfono': customer.phone || '',
        'Email': customer.email || '',
        'Dirección': customer.address || '',
        'Descripción': customer.description || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

      const columnWidths = [
        { wch: 5 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 },
        { wch: 30 },
        { wch: 40 },
        { wch: 50 },
      ];
      worksheet['!cols'] = columnWidths;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const fecha = new Date().toISOString().split('T')[0];
      link.download = `customers_${fecha}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.showToast(`Se exportaron ${this.customers.length} clientes correctamente`, 'success');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      this.showToast('Error al exportar los clientes a Excel', 'danger');
    }
  }

  triggerFileInput() {
    const fileInput = document.getElementById('customers-excel-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.showToast('Por favor selecciona un archivo Excel (.xlsx o .xls)', 'danger');
      input.value = '';
      return;
    }

    try {
      this.loadingService.show('Leyendo archivo Excel...');

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (!data || data.length === 0) {
        this.loadingService.hide();
        this.showToast('El archivo Excel está vacío o no tiene datos', 'danger');
        input.value = '';
        return;
      }

      await this.processExcelData(data);

      input.value = '';
    } catch (error) {
      console.error('Error al leer el archivo Excel:', error);
      this.loadingService.hide();
      this.showToast('Error al leer el archivo Excel. Verifica que el archivo no esté corrupto.', 'danger');
      input.value = '';
    }
  }

  async processExcelData(data: any[]) {
    try {
      const requiredColumns = ['Nombre', 'Ciudad', 'Teléfono'];
      const optionalColumns = ['Email', 'Dirección', 'Descripción'];

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
          `El archivo Excel no tiene las columnas requeridas: ${missingColumns.join(
            ', '
          )}. Las columnas requeridas son: ${requiredColumns.join(', ')}`,
          'danger'
        );
        return;
      }

      const customersToCreate: Omit<Customer, 'id' | 'createdAt'>[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        try {
          const name = String(row['Nombre'] || '').trim();
          const city = String(row['Ciudad'] || '').trim();
          const phone = String(row['Teléfono'] || '').trim();
          const email = row['Email'] ? String(row['Email']).trim() : '';
          const address = row['Dirección'] ? String(row['Dirección']).trim() : '';
          const description = row['Descripción'] ? String(row['Descripción']).trim() : '';

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

          if (!/^[0-9-]+$/.test(phone)) {
            errors.push(`Fila ${rowNumber}: El teléfono solo debe contener números y guiones (-)`);
            continue;
          }

          if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              errors.push(`Fila ${rowNumber}: El email no tiene un formato válido`);
              continue;
            }
          }

          const customerData: Omit<Customer, 'id' | 'createdAt'> = {
            name,
            city,
            phone,
          };

          if (email) {
            customerData.email = email;
          }

          if (address) {
            customerData.address = address;
          }

          if (description) {
            customerData.description = description;
          }

          customersToCreate.push(customerData);
        } catch (error) {
          errors.push(`Fila ${rowNumber}: Error al procesar los datos - ${error}`);
        }
      }

      if (errors.length > 0) {
        this.loadingService.hide();
        const errorMessage =
          errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... y ${errors.length - 5} errores más` : '');

        const alert = await this.alertController.create({
          header: 'Errores de validación',
          message: `Se encontraron ${errors.length} error(es) en el archivo:\n\n${errorMessage}\n\n¿Deseas continuar con los registros válidos?`,
          buttons: [
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Continuar',
              handler: async () => {
                await this.createCustomersFromExcel(customersToCreate);
              },
            },
          ],
        });
        await alert.present();
        return;
      }

      await this.createCustomersFromExcel(customersToCreate);
    } catch (error) {
      console.error('Error al procesar datos del Excel:', error);
      this.loadingService.hide();
      this.showToast('Error al procesar los datos del Excel', 'danger');
    }
  }

  async createCustomersFromExcel(customers: Omit<Customer, 'id' | 'createdAt'>[]) {
    if (customers.length === 0) {
      this.loadingService.hide();
      this.showToast('No hay clientes válidos para crear', 'warning');
      return;
    }

    try {
      this.loadingService.show(`Creando ${customers.length} cliente(s)...`);

      let successCount = 0;
      let errorCount = 0;

      for (const customer of customers) {
        try {
          await this.customersService.create(customer);
          successCount++;
        } catch (error) {
          console.error('Error al crear cliente:', error);
          errorCount++;
        }
      }

      this.loadingService.hide();

      if (successCount > 0) {
        this.showToast(
          `Se importaron ${successCount} cliente(s) correctamente${errorCount > 0 ? `. ${errorCount} error(es)` : ''}`,
          successCount === customers.length ? 'success' : 'warning'
        );

        await this.loadCustomers();
      } else {
        this.showToast('No se pudo importar ningún cliente', 'danger');
      }
    } catch (error) {
      console.error('Error al crear clientes:', error);
      this.loadingService.hide();
      this.showToast('Error al crear los clientes', 'danger');
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  openModal(customer?: Customer) {
    this.formSubmitted = false;
    this.customerForm.reset();

    Object.keys(this.customerForm.controls).forEach((key) => {
      this.customerForm.get(key)?.markAsUntouched();
      this.customerForm.get(key)?.markAsPristine();
    });

    if (customer) {
      this.isEditing = true;
      this.editingCustomerId = customer.id || null;
      this.customerForm.patchValue(
        {
          name: customer.name,
          city: customer.city,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          description: customer.description || '',
        },
        { emitEvent: false }
      );

      Object.keys(this.customerForm.controls).forEach((key) => {
        this.customerForm.get(key)?.markAsUntouched();
        this.customerForm.get(key)?.markAsPristine();
      });
    } else {
      this.isEditing = false;
      this.editingCustomerId = null;
      this.customerForm.reset(
        {
          name: '',
          city: '',
          phone: '',
          email: '',
          address: '',
          description: '',
        },
        { emitEvent: false }
      );
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.formSubmitted = false;
    this.customerForm.reset();
    Object.keys(this.customerForm.controls).forEach((key) => {
      this.customerForm.get(key)?.markAsUntouched();
      this.customerForm.get(key)?.markAsPristine();
    });
    this.isEditing = false;
    this.editingCustomerId = null;
  }

  async saveCustomer() {
    this.formSubmitted = true;

    if (this.customerForm.invalid) {
      Object.keys(this.customerForm.controls).forEach((key) => {
        this.customerForm.get(key)?.markAsTouched();
      });
      this.showToast('Por favor completa los campos requeridos', 'warning');
      return;
    }

    this.loadingService.show(this.isEditing ? 'Actualizando cliente...' : 'Creando cliente...');

    try {
      const formValue = this.customerForm.value;

      const customerData: Omit<Customer, 'id' | 'createdAt'> = {
        name: formValue.name,
        city: formValue.city,
        phone: formValue.phone,
      };

      if (formValue.email && formValue.email.trim() !== '') {
        customerData.email = formValue.email.trim();
      }

      if (formValue.address && formValue.address.trim() !== '') {
        customerData.address = formValue.address.trim();
      }

      if (formValue.description && formValue.description.trim() !== '') {
        customerData.description = formValue.description.trim();
      }

      if (this.isEditing && this.editingCustomerId) {
        await this.customersService.update(this.editingCustomerId, customerData);
        this.showToast('Cliente actualizado correctamente', 'success');
      } else {
        await this.customersService.create(customerData);
        this.showToast('Cliente creado correctamente', 'success');
      }

      await this.loadCustomers();
      this.closeModal();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      this.showToast('Error al guardar el cliente', 'danger');
      this.loadingService.hide();
    } finally {
      this.loadingService.hide();
    }
  }

  async deleteCustomer(customer: Customer) {
    if (!customer.id) {
      this.showToast('Error: ID del cliente no encontrado', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar el cliente "${customer.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.loadingService.show('Eliminando cliente...');

            try {
              await this.customersService.delete(customer.id!);
              this.showToast('Cliente eliminado correctamente', 'success');
              await this.loadCustomers();
            } catch (error) {
              console.error('Error al eliminar cliente:', error);
              this.showToast('Error al eliminar el cliente', 'danger');
              this.loadingService.hide();
            } finally {
              this.loadingService.hide();
            }
          },
        },
      ],
    });

    await alert.present();
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
}

