import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-baby-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './baby-loading.component.html',
  styleUrls: ['./baby-loading.component.scss']
})
export class BabyLoadingComponent {
  @Input() message: string = 'Cargando...';
  @Input() show: boolean = false;
}
