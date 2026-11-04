import type { ISODate } from '@/lib/dates';

import { db, type Executor } from '../client';
import { balanceBook } from '../queries/balances';

/** Every account with a balance, on its debit or credit side. Totals must agree. */
export function trialBalance(asOf: ISODate, ex: Executor = db) {
  const b = balanceBook({ to: asOf }, ex);
  const rows = b.list
    .filter((a) => !a.isGroup && b.raw(a.id) !== 0)
    .map((a) => {
      const raw = b.raw(a.id);
      return { accountId: a.id, code: a.code, name: a.name, debit: raw > 0 ? raw : 0, credit: raw < 0 ? -raw : 0 };
    });
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  return { rows, debit, credit, balanced: debit === credit };
}
