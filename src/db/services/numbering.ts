import { eq, sql } from 'drizzle-orm';

import type { Executor } from '../client';
import { settings, type InvoiceKind, type VoucherKind } from '../schema';

export type DocKind = InvoiceKind | VoucherKind;

const COLUMN = {
  SI: settings.nextSI,
  SR: settings.nextSR,
  PI: settings.nextPI,
  PR: settings.nextPR,
  CRV: settings.nextCRV,
  CPV: settings.nextCPV,
  JV: settings.nextJV,
} as const;

const KEY = {
  SI: 'nextSI',
  SR: 'nextSR',
  PI: 'nextPI',
  PR: 'nextPR',
  CRV: 'nextCRV',
  CPV: 'nextCPV',
  JV: 'nextJV',
} as const;

/** `SI-1050`, `CRV-0090` (padded to 4 digits). */
export function formatDocNumber(kind: DocKind, n: number): string {
  return `${kind}-${String(n).padStart(4, '0')}`;
}

/** Next number without consuming it (form headers). */
export function peekNextNumber(ex: Executor, kind: DocKind): string {
  const row = ex.select().from(settings).where(eq(settings.id, 'main')).get();
  return formatDocNumber(kind, row ? row[KEY[kind]] : 1);
}

/** Consumes the next number. Call inside the document's transaction. */
export function takeNextNumber(ex: Executor, kind: DocKind): string {
  const number = peekNextNumber(ex, kind);
  ex.update(settings)
    .set({ [KEY[kind]]: sql`${COLUMN[kind]} + 1` })
    .where(eq(settings.id, 'main'))
    .run();
  return number;
}
