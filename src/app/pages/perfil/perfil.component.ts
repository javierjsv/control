import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonMenuButton, IonButtons, IonItem, IonLabel, IonAvatar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';
import { addIcons } from 'ionicons';
import { checkmarkCircle, alertCircle } from 'ionicons/icons';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonMenuButton, 
    IonButtons,
    IonItem,
    IonLabel,
    IonAvatar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonIcon
  ],
})
export class PerfilComponent implements OnInit {
  private auth = inject(Auth);
  
  currentUser: User | null = null;
  isLoading = true;

  constructor() {
    addIcons({ checkmarkCircle, alertCircle });
  }

  ngOnInit() {
    // Obtener el usuario actual
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this.isLoading = false;
    });
  }

  getDisplayName(): string {
    if (this.currentUser?.displayName) {
      return this.currentUser.displayName;
    }
    if (this.currentUser?.email) {
      return this.currentUser.email.split('@')[0];
    }
    return 'Usuario';
  }

  getEmail(): string {
    return this.currentUser?.email || 'No disponible';
  }

  getPhotoURL(): string {
    return this.currentUser?.photoURL || 'https://www.gravatar.com/avatar?d=mp';
  }

  getCreationDate(): string {
    if (this.currentUser?.metadata?.creationTime) {
      const date = new Date(this.currentUser.metadata.creationTime);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return 'No disponible';
  }

  getLastSignIn(): string {
    if (this.currentUser?.metadata?.lastSignInTime) {
      const date = new Date(this.currentUser.metadata.lastSignInTime);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'No disponible';
  }

  isEmailVerified(): boolean {
    return this.currentUser?.emailVerified || false;
  }
}
