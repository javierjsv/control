import { Injectable, inject } from '@angular/core';
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
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Proveedor } from '../core/interfaces/proveedor.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private readonly collectionName = 'suppliers';
  private readonly pageSize = 20;
  private firestore = inject(Firestore);

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
   * Obtiene proveedores paginados (primera página)
   * @returns Promise con los proveedores y el último documento para la siguiente página
   */
  async getPaginated(): Promise<{ proveedores: Proveedor[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    const suppliersRef = collection(this.firestore, this.collectionName);
    const q = query(
      suppliersRef, 
      orderBy('name', 'asc'),
      limit(this.pageSize)
    );
    
    const snapshot = await getDocs(q);
    const proveedores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Proveedor[];
    
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;
    
    return { proveedores, lastDoc, hasMore };
  }

  /**
   * Carga más proveedores (siguiente página)
   * @param lastDoc Último documento de la página anterior
   * @returns Promise con los proveedores y el último documento para la siguiente página
   */
  async loadMore(lastDoc: QueryDocumentSnapshot<DocumentData>): Promise<{ proveedores: Proveedor[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    const suppliersRef = collection(this.firestore, this.collectionName);
    const q = query(
      suppliersRef,
      orderBy('name', 'asc'),
      startAfter(lastDoc),
      limit(this.pageSize)
    );
    
    const snapshot = await getDocs(q);
    const proveedores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Proveedor[];
    
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;
    
    return { proveedores, lastDoc: newLastDoc, hasMore };
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
