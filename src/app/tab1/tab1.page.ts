import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Product } from '../core/interfaces/product.interfaces';



@Component({
  selector: 'app-tab1',
  standalone: true,
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
})
export class Tab1Page {

  products: Product[] = [
    {
      id: 1,
      name: 'UltraBook Pro X',
      category: 'HIGH-PERFORMANCE LAPTOP',
      price: 1999.00,
      originalPrice: 2499.00,
      image: 'https://picsum.photos/id/237/400/300',
      description: 'Cutting-edge performance with Intel Core i9, 32GB RAM, and a 1TB SSD in a sleek, lightweight design.',
      features: ['4K Display', '16-Hour Battery', 'Thunderbolt 4'],
      rating: 4,
      reviews: 245,
      inStock: true,
      hotSale: true
    },
    {
      id: 2,
      name: 'Smart Watch Pro',
      category: 'WEARABLE TECHNOLOGY',
      price: 299.00,
      originalPrice: 399.00,
      image: 'https://picsum.photos/id/237/400/300',
      description: 'Advanced fitness tracking with heart rate monitor, GPS, and 7-day battery life.',
      features: ['GPS', 'Heart Rate', 'Waterproof'],
      rating: 4.5,
      reviews: 128,
      inStock: true,
      hotSale: true
    },
    {
      id: 3,
      name: 'Wireless Headphones',
      category: 'AUDIO EQUIPMENT',
      price: 149.00,
      originalPrice: 199.00,
      image: 'https://picsum.photos/id/237/400/300',
      description: 'Premium sound quality with active noise cancellation and 30-hour battery life.',
      features: ['Noise Cancel', '30h Battery', 'Bluetooth 5.0'],
      rating: 4.2,
      reviews: 89,
      inStock: true,
      hotSale: false
    },
    {
      id: 4,
      name: 'Wireless Headphones',
      category: 'AUDIO EQUIPMENT',
      price: 149.00,
      originalPrice: 199.00,
      image: 'https://picsum.photos/id/237/400/300',
      description: 'Premium sound quality with active noise cancellation and 30-hour battery life.',
      features: ['Noise Cancel', '30h Battery', 'Bluetooth 5.0'],
      rating: 4.2,
      reviews: 89,
      inStock: true,
      hotSale: false
    },
    {
      id: 5,
      name: 'Wireless Headphones',
      category: 'AUDIO EQUIPMENT',
      price: 149.00,
      originalPrice: 199.00,
      image: 'https://picsum.photos/id/237/400/300',
      description: 'Premium sound quality with active noise cancellation and 30-hour battery life.',
      features: ['Noise Cancel', '30h Battery', 'Bluetooth 5.0'],
      rating: 4.2,
      reviews: 89,
      inStock: true,
      hotSale: false
    }
  ];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  openWhatsApp() {
    const phoneNumber = '3185704290';
    const message = 'Hola, me gustaría obtener más información!';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_system');
  }

  async shareProduct(product: Product) {
    const shareData = {
      title: product.name,
      text: `${product.name} - ${product.description} - Precio: $${product.price}`,
      url: window.location.href
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
    const shareText = encodeURIComponent(`${product.name} - ${product.description}`);
    const shareUrl = encodeURIComponent(window.location.href);
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
          await this.copyToClipboard(window.location.href);
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
