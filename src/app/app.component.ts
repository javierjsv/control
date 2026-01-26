import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { person, cube, business  , home} from 'ionicons/icons';
import { RouterLink } from '@angular/router';
import { BabyLoadingComponent } from './core/components/baby-loading/baby-loading.component';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, RouterLink, BabyLoadingComponent],
})
export class AppComponent implements OnInit {
  loadingMessage = 'Cargando...';
  showLoading = false;

  constructor(private loadingService: LoadingService) {
    addIcons({ person, cube, business , home });
  }

  ngOnInit() {
    this.loadingService.loading$.subscribe(loading => {
      this.showLoading = loading.show;
      this.loadingMessage = loading.message;
    });
  }
}
