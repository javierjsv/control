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
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search } from 'ionicons/icons';
import { ProveedoresService } from '../../services/proveedores.service';
import { Proveedor } from '../../core/interfaces/proveedor.interfaces';
import { LoadingService } from '../../core/services/loading.service';
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
    IonSpinner
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

  private proveedoresService = inject(ProveedoresService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search });
    
    this.proveedorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required]],
      company: [''],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required]],
      description: ['']
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

  loadProveedores() {
    this.isLoading = true;
    this.loadingService.show('Cargando proveedores...');
    this.proveedoresSubscription = this.proveedoresService.getAll().subscribe({
      next: (proveedores) => {
        this.proveedores = proveedores;
        this.applyFilter();
        this.isLoading = false;
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error al cargar proveedores:', error);
        this.showToast('Error al cargar proveedores', 'danger');
        this.isLoading = false;
        this.loadingService.hide();
      }
    });
  }

  onSearchChange(event: CustomEvent) {
    this.searchTerm = (event.detail.value as string) || '';
    this.applyFilter();
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
      this.loadProveedores();
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
              this.loadProveedores();
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
