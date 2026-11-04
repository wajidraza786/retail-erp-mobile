/**
 * Money is stored as integer paisa (Rs 12,399.00 → 1239900). Never use floats for
 * stored amounts; convert only here.
 */
export type Paisa = number;

export const PAISA_PER_RUPEE = 100;

/** Parses user input like "12,399" or "12399.5" into paisa. Invalid input → 0. */
export function toPaisa(input: string | number | null | undefined): Paisa {
  if (input === null || input === undefined) return 0;
  const n = typeof input === 'number' ? input : parseFloat(String(input).replace(/,/g, '').trim());
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * PAISA_PER_RUPEE);
}

/** Paisa → rupees (number). For display and input prefills only. */
export function fromPaisa(paisa: Paisa): number {
  return paisa / PAISA_PER_RUPEE;
}

/** Paisa → editable string for an input ("12399", "12399.5"). Empty for zero. */
export function paisaToInput(paisa: Paisa): string {
  if (!paisa) return '';
  const r = fromPaisa(paisa);
  return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, '');
}

/** Parses a quantity input into a non-negative integer. */
export function toQty(input: string | number | null | undefined): number {
  const n = typeof input === 'number' ? input : parseInt(String(input ?? '').replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
