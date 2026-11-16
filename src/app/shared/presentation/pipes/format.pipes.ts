import { Pipe, PipeTransform } from '@angular/core';
import { Moneda, simboloMoneda } from '../../domain/common';
import { formatDate } from '../../domain/finance/dates';

const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234.5 -> "S/ 1,234.50" */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, moneda: Moneda | null = 'PEN'): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${simboloMoneda(moneda)} ${fmt.format(value)}`;
  }
}

/** Tanto por uno -> porcentaje. 0.24 -> "24.0000%" */
@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = 4): string {
    if (value == null || Number.isNaN(value)) return '—';
    return `${(value * 100).toFixed(decimals)}%`;
  }
}

/** ISO -> dd/mm/yyyy [hh:mm] */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(value: string | null | undefined, withTime = false): string {
    return formatDate(value, withTime);
  }
}
