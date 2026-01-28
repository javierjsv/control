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
import { Customer } from '../core/interfaces/customer.interfaces';

@Injectable({
  providedIn: 'root',
})
export class CustomersService {
  private readonly collectionName = 'customers';
  private readonly pageSize = 20;
  private firestore = inject(Firestore);

  getAll(): Observable<Customer[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Customer[]>;
  }

  async getPaginated(): Promise<{
    customers: Customer[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('name', 'asc'), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Customer[];
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { customers, lastDoc, hasMore };
  }

  async loadMore(
    lastDoc: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ customers: Customer[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('name', 'asc'), startAfter(lastDoc), limit(this.pageSize));

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Customer[];
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === this.pageSize;

    return { customers, lastDoc: newLastDoc, hasMore };
  }

  getById(id: string): Observable<Customer> {
    const ref = doc(this.firestore, this.collectionName, id);
    return docData(ref, { idField: 'id' }) as Observable<Customer>;
  }

  async create(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
    const ref = collection(this.firestore, this.collectionName);
    const data = {
      ...customer,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }

  async update(id: string, customer: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, customer);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return deleteDoc(ref);
  }

  filterByName(searchTerm: string): Observable<Customer[]> {
    if (!searchTerm || searchTerm.trim() === '') {
      return this.getAll();
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return this.getAll().pipe(
      map((customers) => customers.filter((c) => c.name.toLowerCase().includes(searchLower)))
    );
  }
}

