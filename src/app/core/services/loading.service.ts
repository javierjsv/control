import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<{ show: boolean; message: string }>({
    show: false,
    message: 'Cargando...'
  });

  public loading$: Observable<{ show: boolean; message: string }> = this.loadingSubject.asObservable();

  show(message: string = 'Cargando...') {
    this.loadingSubject.next({ show: true, message });
  }

  hide() {
    this.loadingSubject.next({ show: false, message: '' });
  }
}
