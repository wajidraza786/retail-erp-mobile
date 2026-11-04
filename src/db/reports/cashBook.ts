import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { postings } from '../schema';
import type { Range } from '../queries/balances';
import { getSystemAccounts } from '../services/accounts';

/** Every rupee in and out of the cash drawer for a period, newest first. */
export function cashBook(range: Range, ex: Executor = db) {
  const cashId = getSystemAccounts(ex).cash;
  const isOpening = or(sql`${postings.date} < ${range.from}`, eq(postings.sourceType, 'opening'));
  const openingRow = ex
    .select({ v: sql<number>`coalesce(sum(${postings.debit} - ${postings.credit}), 0)` })
    .from(postings)
    .where(and(eq(postings.accountId, cashId), isNull(postings.deletedAt), lte(postings.date, range.to), isOpening))
    .get();
  const opening = Number(openingRow?.v ?? 0);

  const entries = ex
    .select()
    .from(postings)
    .where(
      and(
        eq(postings.accountId, cashId),
        isNull(postings.deletedAt),
        sql`${postings.date} >= ${range.from}`,
        lte(postings.date, range.to),
        sql`${postings.sourceType} != 'opening'`,
      ),
    )
    .orderBy(asc(postings.date), asc(postings.createdAt), asc(postings.lineNo))
    .all();

  let running = opening;
  let moneyIn = 0;
  let moneyOut = 0;
  const rows = entries.map((p) => {
    running += p.debit - p.credit;
    moneyIn += p.debit;
    moneyOut += p.credit;
    return {
      id: p.id,
      date: p.date,
      who: p.counterpartyLabel ?? p.memo,
      ref: p.ref,
      memo: p.memo,
      amount: p.debit - p.credit,
      running,
      sourceType: p.sourceType,
      sourceId: p.sourceId,
    };
  });
  return { opening, moneyIn, moneyOut, closing: running, rows: rows.reverse() };
}
