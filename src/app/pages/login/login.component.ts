import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mail, lockClosed, eye, eyeOff } from 'ionicons/icons';
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon
  ]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  formSubmitted = false;

  private auth = inject(Auth);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  constructor() {
    addIcons({ mail, lockClosed, eye, eyeOff });
    
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Verificar si ya está autenticado
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.router.navigate(['/tabs/tab1']);
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onForgotPassword() {
    const toast = await this.toastController.create({
      message: 'Funcionalidad de recuperación de contraseña próximamente',
      duration: 2000,
      position: 'bottom',
      color: 'medium'
    });
    await toast.present();
  }

  async onSubmit() {
    this.formSubmitted = true;

    if (this.loginForm.invalid) {
      const toast = await this.toastController.create({
        message: 'Por favor completa todos los campos correctamente',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      await signInWithEmailAndPassword(this.auth, email, password);
      
      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: '¡Bienvenido!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      // Redirigir al inicio
      this.router.navigate(['/tabs/tab1']);
    } catch (error: any) {
      await loading.dismiss();
      
      let errorMessage = 'Error al iniciar sesión';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde';
      }

      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }
}
