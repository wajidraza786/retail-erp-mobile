import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { accounts, postings, type Account, type PostingSource } from '../schema';
import { naturalBalance } from '../services/ledger';
import { balanceBook } from './balances';

export type CoaNode = { account: Account; depth: number; balance: number; isGroup: boolean; children: CoaNode[] };

/** Chart of accounts as a tree with natural balances (groups = Σ leaves). */
export function getAccountTree(ex: Executor = db): CoaNode[] {
  const b = balanceBook({}, ex);
  const build = (parentId: string | null, depth: number): CoaNode[] =>
    b.list
      .filter((a) => a.parentId === parentId)
      .map((a) => {
        const children = build(a.id, depth + 1);
        return { account: a, depth, balance: b.groupNatural(a.id), isGroup: a.isGroup || children.length > 0, children };
      });
  return build(null, 0);
}

export type LedgerRow = {
  id: string;
  date: string;
  memo: string;
  ref: string;
  counterparty: string | null;
  debit: number;
  credit: number;
  /** Signed effect on the natural balance. */
  delta: number;
  running: number;
  sourceType: PostingSource;
  sourceId: string | null;
};

/** One account's postings in posting order, with a running natural balance. */
export function getLedger(accountId: string, ex: Executor = db) {
  const account = ex.select().from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) return null;
  const rows = ex
    .select()
    .from(postings)
    .where(and(eq(postings.accountId, accountId), isNull(postings.deletedAt)))
    .orderBy(asc(postings.date), asc(postings.createdAt), asc(postings.lineNo))
    .all();
  let running = 0;
  const out: LedgerRow[] = rows.map((p) => {
    const delta = naturalBalance(account.type, p.debit - p.credit);
    running += delta;
    return {
      id: p.id,
      date: p.date,
      memo: p.memo,
      ref: p.ref,
      counterparty: p.counterpartyLabel,
      debit: p.debit,
      credit: p.credit,
      delta,
      running,
      sourceType: p.sourceType,
      sourceId: p.sourceId,
    };
  });
  return { account, rows: out, balance: running };
}
