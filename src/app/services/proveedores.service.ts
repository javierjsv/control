import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Proveedor } from '../models/proveedor.model';

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {
  private proveedores: Proveedor[] = [];
  private proveedoresSubject = new BehaviorSubject<Proveedor[]>([]);
  public proveedores$: Observable<Proveedor[]> = this.proveedoresSubject.asObservable();
  private nextId = 1;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('proveedores');
    if (stored) {
      this.proveedores = JSON.parse(stored).map((p: any) => ({
        ...p,
        fechaCreacion: new Date(p.fechaCreacion)
      }));
      this.nextId = Math.max(...this.proveedores.map(p => p.id), 0) + 1;
    }
    this.proveedoresSubject.next([...this.proveedores]);
  }

  private saveToStorage(): void {
    localStorage.setItem('proveedores', JSON.stringify(this.proveedores));
    this.proveedoresSubject.next([...this.proveedores]);
  }

  getAll(): Proveedor[] {
    return [...this.proveedores];
  }

  getById(id: number): Proveedor | undefined {
    return this.proveedores.find(p => p.id === id);
  }

  create(proveedor: Omit<Proveedor, 'id' | 'fechaCreacion'>): Proveedor {
    const newProveedor: Proveedor = {
      ...proveedor,
      id: this.nextId++,
      fechaCreacion: new Date()
    };
    this.proveedores.push(newProveedor);
    this.saveToStorage();
    return newProveedor;
  }

  update(id: number, proveedor: Partial<Proveedor>): boolean {
    const index = this.proveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.proveedores[index] = { ...this.proveedores[index], ...proveedor };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  delete(id: number): boolean {
    const index = this.proveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.proveedores.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }
}
