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
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Proveedor } from '../models/proveedor.model';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private readonly collectionName = 'suppliers';

  constructor(private firestore: Firestore) {}

  /**
   * Obtiene todos los proveedores de la colección 'suppliers' en Firestore
   * @returns Observable con un array de proveedores
   */
  getAll(): Observable<Proveedor[]> {
    const suppliersRef = collection(this.firestore, this.collectionName);
    const q = query(suppliersRef, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Proveedor[]>;
  }

  /**
   * Obtiene un proveedor por su ID
   * @param id ID del proveedor
   * @returns Observable con el proveedor
   */
  getById(id: string): Observable<Proveedor> {
    const supplierRef = doc(this.firestore, this.collectionName, id);
    return docData(supplierRef, { idField: 'id' }) as Observable<Proveedor>;
  }

  /**
   * Crea un nuevo proveedor en Firestore
   * @param supplier Datos del proveedor (sin id y createdAt)
   * @returns Promise con el ID del documento creado
   */
  async create(supplier: Omit<Proveedor, 'id' | 'createdAt'>): Promise<string> {
    const suppliersRef = collection(this.firestore, this.collectionName);
    const supplierData = {
      ...supplier,
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(suppliersRef, supplierData);
    return docRef.id;
  }

  /**
   * Actualiza un proveedor existente
   * @param id ID del proveedor a actualizar
   * @param supplier Datos parciales del proveedor a actualizar
   * @returns Promise que se resuelve cuando la actualización es exitosa
   */
  async update(id: string, supplier: Partial<Omit<Proveedor, 'id' | 'createdAt'>>): Promise<void> {
    const supplierRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(supplierRef, supplier);
  }

  /**
   * Elimina un proveedor de Firestore
   * @param id ID del proveedor a eliminar
   * @returns Promise que se resuelve cuando la eliminación es exitosa
   */
  async delete(id: string): Promise<void> {
    const supplierRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(supplierRef);
  }

  /**
   * Filtra proveedores por nombre (búsqueda parcial, case-insensitive)
   * @param searchTerm Término de búsqueda para filtrar por nombre
   * @returns Observable con un array de proveedores filtrados
   */
  filterByName(searchTerm: string): Observable<Proveedor[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.getAll();
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return this.getAll().pipe(
      map(suppliers => 
        suppliers.filter(supplier => 
          supplier.name.toLowerCase().includes(searchLower)
        )
      )
    );
  }
}
