import { Signal } from '@angular/core';

export interface Entity {
  readonly id: number;
}

export type NewEntity<T extends Entity> = Omit<T, 'id'>;

/**
 * Puerto genérico de persistencia. Cada bounded context declara su repositorio
 * extendiendo esta clase abstracta (que además sirve como token de inyección) y
 * la capa de infraestructura provee la implementación concreta.
 *
 * `all` es un Signal para que la capa de presentación sea reactiva.
 */
export abstract class Repository<T extends Entity> {
  abstract readonly all: Signal<T[]>;
  abstract findById(id: number | null | undefined): T | undefined;
  abstract add(entity: NewEntity<T>): T;
  abstract update(id: number, changes: Partial<NewEntity<T>>): T;
}
