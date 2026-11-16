/** Tipos compartidos entre bounded contexts (shared kernel). */
export type EstadoActivo = 'ACTIVO' | 'INACTIVO';
export type Moneda = 'PEN' | 'USD';

export const simboloMoneda = (m: Moneda | null | undefined): string => (m === 'USD' ? 'US$' : 'S/');
