import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonButton, ToastController, MenuController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { person, cube, business, home, pricetags, logIn, logOut, cash, barChart, alertCircle, documentText } from 'ionicons/icons';
import { Router, RouterLink } from '@angular/router';
import { BabyLoadingComponent } from './core/components/baby-loading/baby-loading.component';
import { LoadingService } from './core/services/loading.service';
import { Auth, onAuthStateChanged, signOut, User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [CommonModule, IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, RouterLink, BabyLoadingComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  private loadingService = inject(LoadingService);
  private auth = inject(Auth);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private menuController = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);
  
  loadingMessage = 'Cargando...';
  showLoading = false;
  isAuthenticated = false;
  currentUser: User | null = null;
  private authSubscription?: Subscription;

  constructor() {
    addIcons({ person, cube, business, home, pricetags, logIn, logOut, cash, barChart, alertCircle, documentText });
  }

  ngOnInit() {
    this.loadingService.loading$.subscribe(loading => {
      this.showLoading = loading.show;
      this.loadingMessage = loading.message;
    });

    // Observar cambios en el estado de autenticación
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
      this.cdr.detectChanges(); // Forzar detección de cambios
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async logout() {
    try {
      await this.menuController.close();
      await signOut(this.auth);
      
      const toast = await this.toastController.create({
        message: 'Sesión cerrada correctamente',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      // Redirigir al login
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      const toast = await this.toastController.create({
        message: 'Error al cerrar sesión',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }
}
