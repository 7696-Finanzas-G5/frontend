import { Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'credibarrio.token';

/** Guarda el JWT de la sesión (sessionStorage: se descarta al cerrar la pestaña). */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly _token = signal<string | null>(this.read());
  readonly token = this._token.asReadonly();

  set(token: string): void {
    this._token.set(token);
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }

  clear(): void {
    this._token.set(null);
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignorado */
    }
  }

  private read(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}
