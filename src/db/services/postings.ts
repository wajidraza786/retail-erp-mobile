import * as Crypto from 'expo-crypto';
import { and, eq } from 'drizzle-orm';

import type { ISODate } from '@/lib/dates';

import type { Executor } from '../client';
import { postings, stockMovements, type PostingSource } from '../schema';
import { assertBalanced, type PostingLine } from './ledger';

type PostingMeta = { date: ISODate; sourceType: PostingSource; sourceId: string; ref: string };

/** Thin writer for the pure builders in `ledger.ts`. Re-checks balance before insert. */
export function writePostings(ex: Executor, lines: PostingLine[], meta: PostingMeta) {
  assertBalanced(lines);
  if (!lines.length) return;
  ex.insert(postings)
    .values(
      lines.map((l, i) => ({
        id: Crypto.randomUUID(),
        date: meta.date,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo,
        counterpartyLabel: l.counterparty,
        sourceType: meta.sourceType,
        sourceId: meta.sourceId,
        ref: meta.ref,
        lineNo: i,
      })),
    )
    .run();
}

/** Used on edit / delete of a document: remove its postings and stock movements, then re-post. */
export function clearDocumentEffects(ex: Executor, sourceType: PostingSource, sourceId: string) {
  ex.delete(postings)
    .where(and(eq(postings.sourceType, sourceType), eq(postings.sourceId, sourceId)))
    .run();
  ex.delete(stockMovements).where(eq(stockMovements.sourceId, sourceId)).run();
}
