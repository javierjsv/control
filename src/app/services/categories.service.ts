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
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Category } from '../core/interfaces/category.interfaces';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly collectionName = 'categories';
  private readonly pageSize = 20;
  private firestore = inject(Firestore);

  /**
   * Obtiene todas las categorías de la colección 'categories' en Firestore
   */
  getAll(): Observable<Category[]> {
    const categoriesRef = collection(this.firestore, this.collectionName);
    const q = query(categoriesRef, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Category[]>;
  }

  /**
   * Obtiene categorías paginadas (primera página)
   */
  async getPaginated(): Promise<{
    categories: Category[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    const categoriesRef = collection(this.firestore, this.collectionName);
    const q = query(categoriesRef, orderBy('name', 'asc'), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Category[];

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { categories, lastDoc, hasMore };
  }

  /**
   * Carga más categorías (siguiente página)
   */
  async loadMore(
    lastDoc: QueryDocumentSnapshot<DocumentData>
  ): Promise<{
    categories: Category[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    const categoriesRef = collection(this.firestore, this.collectionName);
    const q = query(
      categoriesRef,
      orderBy('name', 'asc'),
      startAfter(lastDoc),
      limit(this.pageSize)
    );

    const snapshot = await getDocs(q);
    const categories = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Category[];

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { categories, lastDoc: newLastDoc, hasMore };
  }

  /**
   * Obtiene una categoría por su ID
   */
  getById(id: string): Observable<Category> {
    const categoryRef = doc(this.firestore, this.collectionName, id);
    return docData(categoryRef, { idField: 'id' }) as Observable<Category>;
  }

  /**
   * Crea una nueva categoría en Firestore
   */
  async create(category: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
    const categoriesRef = collection(this.firestore, this.collectionName);
    const categoryData = {
      ...category,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(categoriesRef, categoryData);
    return docRef.id;
  }

  /**
   * Actualiza una categoría existente
   */
  async update(
    id: string,
    category: Partial<Omit<Category, 'id' | 'createdAt'>>
  ): Promise<void> {
    const categoryRef = doc(this.firestore, this.collectionName, id);
    return updateDoc(categoryRef, category);
  }

  /**
   * Elimina una categoría de Firestore
   */
  async delete(id: string): Promise<void> {
    const categoryRef = doc(this.firestore, this.collectionName, id);
    return deleteDoc(categoryRef);
  }

  /**
   * Filtra categorías por nombre (búsqueda parcial, case-insensitive)
   */
  filterByName(searchTerm: string): Observable<Category[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.getAll();
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return this.getAll().pipe(
      map((categories) =>
        categories.filter((category) =>
          category.name.toLowerCase().includes(searchLower)
        )
      )
    );
  }
}

