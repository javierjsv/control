import { Component } from '@angular/core';
import { 
  IonHeader, 
  IonContent, 
  IonCard,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, logoInstagram, logoFacebook, logoWhatsapp, musicalNotes } from 'ionicons/icons';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    IonHeader, 
    IonContent, 
    IonCard,
    IonButton,
    IonIcon
  ],
})
export class Tab3Page {
  constructor() {
    addIcons({ heart, logoInstagram, logoFacebook, logoWhatsapp, musicalNotes });
  }

  openSocialMedia(platform: string) {
    // URLs de ejemplo - reemplazar con las URLs reales de las redes sociales
    const urls: { [key: string]: string } = {
      instagram: 'https://www.instagram.com/tu_panalera',
      facebook: 'https://www.facebook.com/mgrantesoro/?locale=es_LA',
      whatsapp: 'https://wa.me/3185704290',
      tiktok: 'https://www.tiktok.com/@tu_panalera'
    };

    const url = urls[platform];
    if (url) {
      window.open(url, '_blank');
    }
  }
}
