import { format, parseISO } from 'date-fns';

import type { ISODate } from './dates';
import { fromPaisa, type Paisa } from './money';

const grouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** `Rs 12,399`. Absolute value, no decimals (PRD §3.5). */
export function fmt(paisa: Paisa): string {
  return 'Rs ' + grouping.format(Math.round(Math.abs(fromPaisa(paisa))));
}

/** `−Rs 3,799` for negatives (lists). */
export function fmtSigned(paisa: Paisa): string {
  return (paisa < -50 ? '−' : '') + fmt(paisa);
}

/** `+Rs 5,000` / `−Rs 5,000`. */
export function fmtDelta(paisa: Paisa): string {
  return (paisa >= 0 ? '+' : '−') + fmt(paisa);
}

/** `(Rs 3,799)` for negatives (statements, trial balance). */
export function fmtParen(paisa: Paisa): string {
  return paisa < -50 ? '(' + fmt(paisa) + ')' : fmt(paisa);
}

export function fmtQty(n: number): string {
  return grouping.format(n);
}

/** `14 Oct` */
export function dateLabel(d: ISODate): string {
  return format(parseISO(d), 'd MMM');
}

/** `14 Oct 2026` */
export function dateLabelLong(d: ISODate): string {
  return format(parseISO(d), 'd MMM yyyy');
}

/** `Wednesday 14 October` */
export function weekdayLabel(d: ISODate): string {
  return format(parseISO(d), 'EEEE d MMMM');
}

/** `October 2026` */
export function monthLabel(d: ISODate): string {
  return format(parseISO(d), 'MMMM yyyy');
}

/** Date block for ledger rows: `{ day: '14', mon: 'Oct' }`. */
export function dateBlock(d: ISODate): { day: string; mon: string } {
  const p = parseISO(d);
  return { day: format(p, 'd'), mon: format(p, 'MMM') };
}

/** `1 – 14 Oct 2026` */
export function rangeLabel(from: ISODate, to: ISODate): string {
  const a = parseISO(from);
  const b = parseISO(to);
  if (format(a, 'yyyy-MM') === format(b, 'yyyy-MM')) return `${format(a, 'd')} – ${format(b, 'd MMMM yyyy')}`;
  return `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`;
}

/** First letters of up to two words (PRD §3.5). */
export function initials(s: string | null | undefined): string {
  const out = (s ?? '')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return out || '?';
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${fmtQty(n)} ${n === 1 ? one : many}`;
}
