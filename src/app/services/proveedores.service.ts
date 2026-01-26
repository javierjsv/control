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
      this.proveedores = JSON.parse(stored).map((p: any) => {
        // Migrar datos antiguos (español) a nuevos (inglés) si es necesario
        const migrated: Proveedor = {
          id: p.id,
          name: p.name || p.nombre,
          contact: p.contact || p.contacto,
          phone: p.phone || p.telefono,
          email: p.email,
          address: p.address || p.direccion,
          createdAt: new Date(p.createdAt || p.fechaCreacion)
        };
        // Incluir company si existe (nuevo o antiguo)
        if (p.company !== undefined) {
          migrated.company = p.company;
        } else if (p.empresa !== undefined) {
          migrated.company = p.empresa;
        }
        return migrated;
      });
      // Calcular el siguiente ID basado en los IDs existentes (convertir a número, encontrar el máximo, y sumar 1)
      const maxId = this.proveedores.length > 0 
        ? Math.max(...this.proveedores.map(p => {
            const numId = parseInt(p.id, 10);
            return isNaN(numId) ? 0 : numId;
          }), 0)
        : 0;
      this.nextId = maxId + 1;
      // Guardar los datos migrados de vuelta al localStorage
      this.saveToStorage();
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

  getById(id: string): Proveedor | undefined {
    return this.proveedores.find(p => p.id === id);
  }

  create(proveedor: Omit<Proveedor, 'id' | 'createdAt'>): Proveedor {
    const newProveedor: Proveedor = {
      ...proveedor,
      id: String(this.nextId++),
      createdAt: new Date()
    };
    this.proveedores.push(newProveedor);
    this.saveToStorage();
    return newProveedor;
  }

  update(id: string, proveedor: Partial<Proveedor>): boolean {
    const index = this.proveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.proveedores[index] = { ...this.proveedores[index], ...proveedor };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  delete(id: string): boolean {
    const index = this.proveedores.findIndex(p => p.id === id);
    if (index !== -1) {
      this.proveedores.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }
}
