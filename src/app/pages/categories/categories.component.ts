import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
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
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark, search } from 'ionicons/icons';
import { CategoriesService } from '../../services/categories.service';
import { Category } from '../../core/interfaces/category.interfaces';
import { LoadingService } from '../../core/services/loading.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
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
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    MatPaginatorModule,
  ],
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  categoryForm: FormGroup;
  isModalOpen = false;
  isEditing = false;
  editingCategoryId: string | null = null;
  isLoading = false;
  formSubmitted = false;
  searchTerm: string = '';
  private lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  hasMore = true;
  isLoadingMore = false;

  // Paginación para tabla
  paginatedCategories: Category[] = [];
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];
  totalItems = 0;

  private categoriesService = inject(CategoriesService);
  private fb = inject(FormBuilder);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ add, create, trash, close, checkmark, search });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      icon: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  async loadCategories() {
    this.isLoading = true;
    this.loadingService.show('Cargando categorías...');
    try {
      const result = await this.categoriesService.getPaginated();
      this.categories = result.categories;
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.updatePaginatedCategories();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.showToast('Error al cargar categorías', 'danger');
    } finally {
      this.isLoading = false;
      this.loadingService.hide();
    }
  }

  async loadMoreCategories(event: any) {
    if (!this.lastDoc || !this.hasMore || this.isLoadingMore || this.searchTerm) {
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      const result = await this.categoriesService.loadMore(this.lastDoc);
      this.categories = [...this.categories, ...result.categories];
      this.lastDoc = result.lastDoc;
      this.hasMore = result.hasMore;
      this.applyFilter();
      this.isLoadingMore = false;
      event.target.complete();

      if (!this.hasMore) {
        event.target.disabled = true;
      }
    } catch (error) {
      console.error('Error al cargar más categorías:', error);
      this.showToast('Error al cargar más categorías', 'danger');
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  onSearchChange(event: CustomEvent) {
    this.searchTerm = (event.detail.value as string) || '';
    this.applyFilter();
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredCategories = this.categories;
    } else {
      const searchLower = this.searchTerm.toLowerCase().trim();
      this.filteredCategories = this.categories.filter((category) =>
        category.name.toLowerCase().includes(searchLower)
      );
    }
    this.updatePaginatedCategories();
  }

  updatePaginatedCategories() {
    this.totalItems = this.filteredCategories.length;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCategories = this.filteredCategories.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedCategories();
  }

  async doRefresh(event: any) {
    try {
      // Resetear paginación
      this.pageIndex = 0;
      this.lastDoc = null;
      this.hasMore = true;

      // Recargar categorías desde el inicio
      await this.loadCategories();

      // Completar el refresh
      event.target.complete();
    } catch (error) {
      console.error('Error al refrescar categorías:', error);
      this.showToast('Error al actualizar categorías', 'danger');
      event.target.complete();
    }
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  openModal(category?: Category) {
    // Resetear el formulario y su estado
    this.formSubmitted = false;
    this.categoryForm.reset();

    // Marcar todos los controles como untouched
    Object.keys(this.categoryForm.controls).forEach((key) => {
      this.categoryForm.get(key)?.markAsUntouched();
      this.categoryForm.get(key)?.markAsPristine();
    });

    if (category) {
      // Modo edición
      this.isEditing = true;
      this.editingCategoryId = category.id || null;
      this.categoryForm.patchValue(
        {
          name: category.name,
          icon: category.icon,
        },
        { emitEvent: false }
      );

      // Marcar como pristine y untouched después de cargar los valores
      Object.keys(this.categoryForm.controls).forEach((key) => {
        this.categoryForm.get(key)?.markAsUntouched();
        this.categoryForm.get(key)?.markAsPristine();
      });
    } else {
      // Modo creación
      this.isEditing = false;
      this.editingCategoryId = null;
      this.categoryForm.reset(
        {
          name: '',
          icon: '',
        },
        { emitEvent: false }
      );
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.formSubmitted = false;
    this.categoryForm.reset();
    Object.keys(this.categoryForm.controls).forEach((key) => {
      this.categoryForm.get(key)?.markAsUntouched();
      this.categoryForm.get(key)?.markAsPristine();
    });
    this.isEditing = false;
    this.editingCategoryId = null;
  }

  async saveCategory() {
    this.formSubmitted = true;

    if (this.categoryForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.categoryForm.controls).forEach((key) => {
        this.categoryForm.get(key)?.markAsTouched();
      });
      this.showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    this.loadingService.show(
      this.isEditing ? 'Actualizando categoría...' : 'Creando categoría...'
    );

    try {
      const formValue = this.categoryForm.value;

      // Construir el objeto de categoría
      const categoryData: Omit<Category, 'id' | 'createdAt'> = {
        name: formValue.name,
        icon: formValue.icon,
      };

      if (this.isEditing && this.editingCategoryId) {
        await this.categoriesService.update(this.editingCategoryId, categoryData);
        this.showToast('Categoría actualizada correctamente', 'success');
      } else {
        await this.categoriesService.create(categoryData);
        this.showToast('Categoría creada correctamente', 'success');
      }

      // Recargar categorías y aplicar filtro
      await this.loadCategories();
      this.closeModal();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      this.showToast('Error al guardar la categoría', 'danger');
      this.loadingService.hide();
    } finally {
      this.loadingService.hide();
    }
  }

  async deleteCategory(category: Category) {
    if (!category.id) {
      this.showToast('Error: ID de la categoría no encontrado', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que deseas eliminar la categoría "${category.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.loadingService.show('Eliminando categoría...');

            try {
              await this.categoriesService.delete(category.id!);
              this.showToast('Categoría eliminada correctamente', 'success');
              // Recargar categorías y aplicar filtro
              await this.loadCategories();
            } catch (error) {
              console.error('Error al eliminar categoría:', error);
              this.showToast('Error al eliminar la categoría', 'danger');
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

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}

