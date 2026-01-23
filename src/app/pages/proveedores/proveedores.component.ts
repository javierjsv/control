import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonFab,
  IonFabButton,
  IonModal,
  IonInput,
  IonTextarea,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, create, trash, close, checkmark } from 'ionicons/icons';
import { ProveedoresService } from '../../services/proveedores.service';
import { Proveedor } from '../../models/proveedor.model';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss'],
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
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonModal,
    IonInput,
    IonTextarea
  ],
})
export class ProveedoresComponent implements OnInit, OnDestroy {
  proveedores: Proveedor[] = [];
  proveedorEditando: Proveedor | null = null;
  isModalOpen = false;
  
  formData = {
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: ''
  };

  constructor(
    private proveedoresService: ProveedoresService,
    private alertController: AlertController
  ) {
    addIcons({ add, create, trash, close, checkmark });
  }

  ngOnInit() {
    this.loadProveedores();
    this.proveedoresService.proveedores$.subscribe(proveedores => {
      this.proveedores = proveedores;
    });
  }

  ngOnDestroy() {
    // Cleanup si es necesario
  }

  loadProveedores() {
    this.proveedores = this.proveedoresService.getAll();
  }

  openModal(proveedor?: Proveedor) {
    if (proveedor) {
      this.proveedorEditando = proveedor;
      this.formData = {
        nombre: proveedor.nombre,
        contacto: proveedor.contacto,
        telefono: proveedor.telefono,
        email: proveedor.email,
        direccion: proveedor.direccion
      };
    } else {
      this.proveedorEditando = null;
      this.formData = {
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        direccion: ''
      };
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.proveedorEditando = null;
    this.formData = {
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: ''
    };
  }

  async saveProveedor() {
    if (!this.formData.nombre || !this.formData.contacto) {
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'El nombre y el contacto son obligatorios',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    if (this.proveedorEditando) {
      // Editar
      this.proveedoresService.update(this.proveedorEditando.id, this.formData);
    } else {
      // Crear
      this.proveedoresService.create(this.formData);
    }
    
    this.closeModal();
  }

  async deleteProveedor(proveedor: Proveedor) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Está seguro de eliminar a ${proveedor.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.proveedoresService.delete(proveedor.id);
          }
        }
      ]
    });

    await alert.present();
  }
}
