import { and, gte, isNull, lte, sql, type SQL } from 'drizzle-orm';

import type { ISODate } from '@/lib/dates';

import { db, type Executor } from '../client';
import { accounts, postings, type Account } from '../schema';
import { naturalBalance, type SystemKey } from '../services/ledger';

export type Range = { from: ISODate; to: ISODate };
export type Sides = { debit: number; credit: number };

/** Σ debit / Σ credit per account, optionally limited to a date window. SQL aggregate only. */
export function accountSides(opts: { from?: ISODate; to?: ISODate; before?: ISODate } = {}, ex: Executor = db): Map<string, Sides> {
  const conds: SQL[] = [isNull(postings.deletedAt)];
  if (opts.from) conds.push(gte(postings.date, opts.from));
  if (opts.to) conds.push(lte(postings.date, opts.to));
  if (opts.before) conds.push(sql`${postings.date} < ${opts.before}`);
  const rows = ex
    .select({
      accountId: postings.accountId,
      debit: sql<number>`coalesce(sum(${postings.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${postings.credit}), 0)`,
    })
    .from(postings)
    .where(and(...conds))
    .groupBy(postings.accountId)
    .all();
  return new Map(rows.map((r) => [r.accountId, { debit: Number(r.debit), credit: Number(r.credit) }]));
}

export function allAccounts(ex: Executor = db): Account[] {
  return ex.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(accounts.code).all();
}

/** Account lookups plus natural balances, the building block for most reports. */
export function balanceBook(opts: { from?: ISODate; to?: ISODate; before?: ISODate } = {}, ex: Executor = db) {
  const list = allAccounts(ex);
  const sides = accountSides(opts, ex);
  const byId = new Map(list.map((a) => [a.id, a]));
  const byKey = new Map(list.filter((a) => a.systemKey).map((a) => [a.systemKey as SystemKey, a]));
  const raw = (id: string) => {
    const s = sides.get(id);
    return s ? s.debit - s.credit : 0;
  };
  const natural = (id: string) => naturalBalance(byId.get(id)?.type ?? 'A', raw(id));
  const key = (k: SystemKey) => byKey.get(k)!;
  const nk = (k: SystemKey) => natural(key(k).id);
  const children = (parentId: string) => list.filter((a) => a.parentId === parentId);
  /** Group balance = Σ natural balances of its leaves. */
  const groupNatural = (id: string): number => {
    const kids = children(id);
    return kids.length ? kids.reduce((s, c) => s + groupNatural(c.id), 0) : natural(id);
  };
  return { list, sides, byId, byKey, raw, natural, key, nk, children, groupNatural };
}

export type BalanceBook = ReturnType<typeof balanceBook>;

/** Net profit for a window: (Sales + Sales Returns[−] + Other Income) − (COGS + expenses). */
export function profitFigures(b: BalanceBook) {
  const sales = b.nk('sales');
  const salesRet = b.nk('salesret'); // contra-income: natural balance is negative
  const netSales = sales + salesRet;
  const cogs = b.nk('cogs');
  const gross = netSales - cogs;
  const otherIncome = b.nk('otherinc');
  const expenseAccounts = b.list.filter((a) => a.type === 'X' && !a.isGroup && a.systemKey !== 'cogs');
  const expenses = expenseAccounts.map((a) => ({ account: a, amount: b.natural(a.id) }));
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const net = gross + otherIncome - totalExpenses;
  return { sales, salesRet, netSales, cogs, gross, otherIncome, expenses, totalExpenses, net };
}
