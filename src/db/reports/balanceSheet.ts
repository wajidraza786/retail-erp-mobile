import type { ISODate } from '@/lib/dates';

import { db, type Executor } from '../client';
import { balanceBook, profitFigures } from '../queries/balances';

export type BsLine = { label: string; amount: number; accountId?: string; link?: 'customers' | 'suppliers' | 'stock' | 'pl' };

/** What the business owns and owes, as of a date. Profit is everything earned to date. */
export function balanceSheet(asOf: ISODate, ex: Executor = db) {
  const b = balanceBook({ to: asOf }, ex);
  const k = (key: Parameters<typeof b.key>[0]) => b.key(key);

  const assets: BsLine[] = [
    { label: 'Cash in hand', amount: b.nk('cash'), accountId: k('cash').id },
    { label: k('bank').name, amount: b.nk('bank'), accountId: k('bank').id },
    { label: 'Customers owe you', amount: b.groupNatural(k('ar').id), link: 'customers' },
    { label: 'Stock in hand', amount: b.nk('inv'), link: 'stock' },
    { label: 'Furniture & fixtures', amount: b.nk('furn'), accountId: k('furn').id },
  ];
  const known = new Set(['cash', 'bank', 'ar', 'inv', 'furn']);
  b.list
    .filter((a) => a.type === 'A' && !a.isGroup && !a.partyType && !known.has(a.systemKey ?? ''))
    .forEach((a) => assets.push({ label: a.name, amount: b.natural(a.id), accountId: a.id }));

  const liabilities: BsLine[] = [{ label: 'Suppliers you owe', amount: b.groupNatural(k('ap').id), link: 'suppliers' }];
  b.list
    .filter((a) => a.type === 'L' && !a.isGroup && !a.partyType)
    .forEach((a) => liabilities.push({ label: a.name, amount: b.natural(a.id), accountId: a.id }));

  const profit = profitFigures(b).net;
  const equity: BsLine[] = [{ label: "Owner's capital", amount: b.nk('capital'), accountId: k('capital').id }];
  const drawings = b.nk('draw');
  if (drawings !== 0) equity.push({ label: 'Drawings', amount: drawings, accountId: k('draw').id });
  equity.push({ label: 'Profit this period', amount: profit, link: 'pl' });

  const total = (ls: BsLine[]) => ls.reduce((s, l) => s + l.amount, 0);
  const totalAssets = total(assets);
  const totalLiabilities = total(liabilities);
  const totalEquity = total(equity);
  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    difference: totalAssets - totalLiabilities - totalEquity,
  };
}
