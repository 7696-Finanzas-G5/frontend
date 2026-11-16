import { Signal, inject } from '@angular/core';
import { Entity, NewEntity, Repository } from '../../domain/repository';
import { LocalDatabase } from './local-database';

/** Implementación genérica de `Repository<T>` sobre una colección de LocalDatabase. */
export abstract class LocalStorageRepository<T extends Entity> implements Repository<T> {
  private readonly db = inject(LocalDatabase);
  readonly all: Signal<T[]>;

  protected constructor(private readonly collectionName: string) {
    this.all = this.db.collection<T>(collectionName);
  }

  findById(id: number | null | undefined): T | undefined {
    return id == null ? undefined : this.all().find((e) => e.id === id);
  }

  add(entity: NewEntity<T>): T {
    const rows = this.all();
    const id = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const created = { ...entity, id } as T;
    this.db.write(this.collectionName, [...rows, created]);
    return created;
  }

  update(id: number, changes: Partial<NewEntity<T>>): T {
    let updated: T | undefined;
    const rows = this.all().map((r) => (r.id === id ? (updated = { ...r, ...changes, id }) : r));
    if (!updated) throw new Error(`Registro ${this.collectionName}#${id} no encontrado`);
    this.db.write(this.collectionName, rows);
    return updated;
  }
}
