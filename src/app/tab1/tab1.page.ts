import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonCard,
  AlertController, 
  ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { Product } from '../core/interfaces/product.interfaces';
import { ProductsService } from '../services/products.service';
import { LoadingService } from '../core/services/loading.service';

@Component({
  selector: 'app-tab1',
  standalone: true,
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonItem, 
    IonLabel, 
    IonInput, 
    IonButton, 
    IonIcon, 
    IonCard
  ],
})
export class Tab1Page implements OnInit {

  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';

  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private productsService = inject(ProductsService);
  private loadingService = inject(LoadingService);

  constructor() {
    addIcons({ close });
  }


  ngOnInit() {
    this.loadingService.show('Cargando productos...');
    this.productsService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.applyFilter();
        console.log('Productos cargados desde Firestore:', products);
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.loadingService.hide();
      }
    });
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
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  openWhatsApp() {
    const phoneNumber = '3185704290';
    const message = 'Hola, me gustaría obtener más información!';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_system');
  }

  goToProductDetail(productId: string | undefined) {
    if (productId) {
      this.router.navigate(['/product', productId]);
    }
  }

  async shareProduct(product: Product) {
    if (!product.id) return;
    const productUrl = `${window.location.origin}/product/${product.id}`;
    const shareData = {
      title: product.name,
      text: `${product.name} - ${product.description} - Precio: $${product.price}`,
      url: productUrl
    };

    // Verificar si Web Share API está disponible (móviles)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        // Si el usuario cancela o hay error, mostrar opciones de redes sociales
        if (err.name !== 'AbortError') {
          this.showSocialShareOptions(product);
        }
      }
    } else {
      // En web, mostrar opciones de redes sociales
      this.showSocialShareOptions(product);
    }
  }

  showSocialShareOptions(product: Product) {
    if (!product.id) return;
    const productUrl = `${window.location.origin}/product/${product.id}`;
    const shareText = encodeURIComponent(`${product.name} - ${product.description}`);
    const shareUrl = encodeURIComponent(productUrl);
    const shareTitle = encodeURIComponent(product.name);

    // Crear un popover con opciones de redes sociales
    const socialOptions = [
      {
        name: 'Facebook',
        icon: 'logo-facebook',
        color: '#1877F2',
        url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`
      },
      {
        name: 'Twitter',
        icon: 'logo-twitter',
        color: '#1DA1F2',
        url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`
      },
      {
        name: 'WhatsApp',
        icon: 'logo-whatsapp',
        color: '#25D366',
        url: `https://wa.me/?text=${shareText}%20${shareUrl}`
      },
      {
        name: 'LinkedIn',
        icon: 'logo-linkedin',
        color: '#0077B5',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`
      },
      {
        name: 'Copiar enlace',
        icon: 'copy-outline',
        color: '#666',
        action: 'copy'
      }
    ];

    // Mostrar alerta con opciones
    this.presentSocialShareAlert(socialOptions, product);
  }

  async presentSocialShareAlert(socialOptions: any[], product: Product) {
    const buttons: any[] = socialOptions.map(option => ({
      text: option.name,
      handler: async () => {
        if (option.action === 'copy') {
          if (!product.id) return;
          const productUrl = `${window.location.origin}/product/${product.id}`;
          await this.copyToClipboard(productUrl);
        } else {
          window.open(option.url, '_blank', 'width=600,height=400');
        }
      }
    }));

    buttons.push({
      text: 'Cancelar',
      role: 'cancel'
    });

    const alert = await this.alertController.create({
      header: 'Compartir producto',
      message: `Comparte "${product.name}" en tus redes sociales`,
      buttons: buttons
    });

    await alert.present();
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      const toast = await this.toastController.create({
        message: 'Enlace copiado al portapapeles',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (err) {
      console.error('Error al copiar:', err);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        const toast = await this.toastController.create({
          message: 'Enlace copiado al portapapeles',
          duration: 2000,
          color: 'success',
          position: 'bottom'
        });
        await toast.present();
      } catch (e) {
        console.error('Error al copiar:', e);
      }
      document.body.removeChild(textArea);
    }
  }

  getStars(rating: number): Array<'full' | 'empty'> {
    const stars: Array<'full' | 'empty'> = [];
    const roundedRating = Math.round(rating * 2) / 2; // Redondea a 0.5
    const fullStars = Math.floor(roundedRating);
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push('full');
      } else {
        stars.push('empty');
      }
    }
    
    return stars;
  }

}
