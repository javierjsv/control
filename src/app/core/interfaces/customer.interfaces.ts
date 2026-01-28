import { Timestamp } from '@angular/fire/firestore';

export interface Customer {
  id?: string;
  name: string;
  city: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt?: Timestamp | Date;
  description?: string;
}

