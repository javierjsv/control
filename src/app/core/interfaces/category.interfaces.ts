import { Timestamp } from '@angular/fire/firestore';

export interface Category {
  id?: string;
  name: string;
  icon: string;
  createdAt?: Timestamp | Date;
}

