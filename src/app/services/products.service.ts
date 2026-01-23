import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from '../core/interfaces/product.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly collectionName = 'products';

  constructor(private firestore: Firestore) {}

  /**
   * Obtiene todos los productos de la colección 'products' en Firestore
   * @returns Observable con un array de productos
   */
  getAll(): Observable<Product[]> {
    const productsRef = collection(this.firestore, this.collectionName);
    const q = query(productsRef, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }
}
