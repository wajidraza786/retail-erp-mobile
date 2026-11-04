import { and, count, eq, isNull, sql } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { accounts, postings, type AccountType } from '../schema';
import { naturalBalance } from '../services/ledger';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { A: 'Asset', L: 'Liability', E: 'Equity', I: 'Income', X: 'Expense' };

/**
 * Account summaries for the General Ledger (aggregates only). Entries for an expanded
 * account are loaded on demand with `getLedger(accountId)`.
 */
export function generalLedger(opts: { type?: AccountType | 'all'; search?: string } = {}, ex: Executor = db) {
  const rows = ex
    .select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      debit: sql<number>`coalesce(sum(${postings.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${postings.credit}), 0)`,
      entries: count(postings.id),
    })
    .from(accounts)
    .innerJoin(postings, and(eq(postings.accountId, accounts.id), isNull(postings.deletedAt)))
    .groupBy(accounts.id)
    .orderBy(accounts.code)
    .all();

  const all = rows.map((r) => {
    const debit = Number(r.debit);
    const credit = Number(r.credit);
    return { ...r, debit, credit, entries: Number(r.entries), closing: naturalBalance(r.type, debit - credit), side: debit - credit >= 0 ? ('Dr' as const) : ('Cr' as const) };
  });
  const totalDebit = all.reduce((s, r) => s + r.debit, 0);
  const totalCredit = all.reduce((s, r) => s + r.credit, 0);

  const q = (opts.search ?? '').trim().toLowerCase();
  const list = all
    .filter((r) => !opts.type || opts.type === 'all' || r.type === opts.type)
    .filter((r) => !q || `${r.name} ${r.code}`.toLowerCase().includes(q));
  return { accounts: list, totalDebit, totalCredit, accountCount: all.length };
}
