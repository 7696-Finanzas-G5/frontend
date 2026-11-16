/** Violación de una regla de negocio (invariante del dominio). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}
