import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DomainError } from '../../domain/domain-error';

type Params = Record<string, string | number | boolean | null | undefined>;

/**
 * Cliente HTTP del backend CrediBarrio. Devuelve promesas y traduce los errores de la API
 * (`{ status, error, message }`) a {@link DomainError} con el mensaje del servidor.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: Params): Promise<T> {
    return this.send(this.http.get<T>(this.url(path), { params: this.params(params) }));
  }

  post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.send(this.http.post<T>(this.url(path), body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.put<T>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.patch<T>(this.url(path), body));
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private params(params?: Params): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v != null && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  private async send<T>(obs: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (e) {
      throw toDomainError(e);
    }
  }
}

/** Error de la API con su código HTTP (útil para distinguir 404 de otros errores). */
export class ApiError extends DomainError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function toDomainError(e: unknown): Error {
  if (!(e instanceof HttpErrorResponse)) return e instanceof Error ? e : new Error(String(e));
  if (e.status === 0) return new ApiError('No se pudo conectar con el servidor de CrediBarrio. Verifique que el backend esté en ejecución.', 0);
  const body = e.error as { message?: string } | null;
  const message = body && typeof body === 'object' && body.message ? body.message : `Error ${e.status} al comunicarse con el servidor.`;
  return new ApiError(message, e.status);
}
