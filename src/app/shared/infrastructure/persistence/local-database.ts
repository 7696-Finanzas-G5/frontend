import { Injectable, Signal, computed, signal } from '@angular/core';

const STORAGE_KEY = 'credibarrio.db.v2';

export type DatabaseSnapshot = Record<string, unknown[]>;
export type SeedFactory = () => Promise<DatabaseSnapshot>;

/**
 * Base de datos local (localStorage) que simula el backend.
 * Cada colección corresponde a una tabla del modelo de datos; los repositorios
 * de cada bounded context acceden solo a su propia colección.
 */
@Injectable({ providedIn: 'root' })
export class LocalDatabase {
  private readonly state = signal<DatabaseSnapshot>({});
  private readonly views = new Map<string, Signal<unknown[]>>();
  private seed: SeedFactory = async () => ({});

  async init(seed: SeedFactory): Promise<void> {
    this.seed = seed;
    const stored = this.read();
    this.state.set(stored ?? (await seed()));
    this.persist();
  }

  async reset(): Promise<void> {
    this.state.set(await this.seed());
    this.persist();
  }

  collection<T>(name: string): Signal<T[]> {
    if (!this.views.has(name)) {
      this.views.set(name, computed(() => this.state()[name] ?? []));
    }
    return this.views.get(name) as Signal<T[]>;
  }

  write<T>(name: string, rows: T[]): void {
    this.state.update((s) => ({ ...s, [name]: rows }));
    this.persist();
  }

  private read(): DatabaseSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DatabaseSnapshot) : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
    }
  }
}
