import { Timestamp } from '@angular/fire/firestore';

export interface Proveedor {
  id?: string;
  name: string;
  city: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  createdAt?: Timestamp | Date;
  description?: string;
  webSite?: string;
}
