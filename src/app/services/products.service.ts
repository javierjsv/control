import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  docData, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
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

  /**
   * Obtiene un producto por su ID
   * @param id ID del producto
   * @returns Observable con el producto
   */
  getById(id: string): Observable<Product> {
    const productRef = doc(this.firestore, this.collectionName, id);
    return docData(productRef, { idField: 'id' }) as Observable<Product>;
  }

  /**
   * Crea un nuevo producto en Firestore
   * @param product Datos del producto (sin id)
   * @returns Promise con el ID del documento creado
   */
  create(product: Omit<Product, 'id'>): Promise<string> {
    const productsRef = collection(this.firestore, this.collectionName);
    return addDoc(productsRef, product).then(docRef => docRef.id);
  }

  /**
   * Actualiza un producto existente
   * @param id ID del producto a actualizar
   * @param product Datos parciales del producto a actualizar
   * @returns Promise que se resuelve cuando la actualización es exitosa
   */
  update(id: string, product: Partial<Omit<Product, 'id'>>): Promise<void> {
    const productRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(productRef, product);
  }

  /**
   * Elimina un producto de Firestore
   * @param id ID del producto a eliminar
   * @returns Promise que se resuelve cuando la eliminación es exitosa
   */
  delete(id: string): Promise<void> {
    const productRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(productRef);
  }

  /**
   * Filtra productos por nombre (búsqueda parcial, case-insensitive)
   * @param searchTerm Término de búsqueda para filtrar por nombre
   * @returns Observable con un array de productos filtrados
   */
  filterByName(searchTerm: string): Observable<Product[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.getAll();
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return this.getAll().pipe(
      map(products => 
        products.filter(product => 
          product.name.toLowerCase().includes(searchLower)
        )
      )
    );
  }
}
