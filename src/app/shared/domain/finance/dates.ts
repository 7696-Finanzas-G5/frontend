/**
 * Utilidades de fecha sin zona horaria.
 * Las fechas se manejan como cadenas ISO 'YYYY-MM-DD' (o 'YYYY-MM-DDTHH:mm' para fecha y hora)
 * para evitar desfases por la zona horaria del navegador.
 */

export interface Ymd {
  y: number;
  m: number; // 1..12
  d: number; // 1..31
}

export function parseYmd(iso: string): Ymd {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Crea una fecha normalizando el desborde de meses y ajustando el día al último día del mes. */
export function makeDate(y: number, m: number, d: number): Ymd {
  const total = y * 12 + (m - 1);
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) };
}

export function addMonths(iso: string, months: number, preferredDay?: number): string {
  const { y, m, d } = parseYmd(iso);
  return toIso(makeDate(y, m + months, preferredDay ?? d));
}

export function toIso({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm' -> 'dd/mm/yyyy' (y ' hh:mm' si tiene hora). */
export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '';
  const { y, m, d } = parseYmd(iso);
  const base = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  return withTime && iso.length >= 16 ? `${base} ${iso.slice(11, 16)}` : base;
}

export function todayIso(): string {
  const now = new Date();
  return toIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

export function nowIsoMinutes(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${todayIso()}T${hh}:${mm}`;
}

export function compareIso(a: string, b: string): number {
  return a.slice(0, 10).localeCompare(b.slice(0, 10));
}
