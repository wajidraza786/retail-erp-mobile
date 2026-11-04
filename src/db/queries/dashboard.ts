import { and, count, gte, inArray, isNull, lte, sql } from 'drizzle-orm';

import { addDays, monthStart, parseDate, type ISODate } from '@/lib/dates';

import { db, type Executor } from '../client';
import { invoices, postings, products } from '../schema';
import { balanceBook, profitFigures } from './balances';
import { listInvoices, listVouchers } from './documents';
import { listParties } from './parties';
import { listProducts } from './products';

export type RecentItem = {
  type: 'invoice' | 'voucher';
  id: string;
  kind: string;
  number: string;
  date: string;
  title: string;
  amount: number;
  /** +1 for receipts, −1 for payments, 0 for neutral. */
  sign: 1 | -1 | 0;
};

/** Net (SI − SR) total per day for the given dates. */
function dailyNetSales(days: ISODate[], ex: Executor) {
  const rows = ex
    .select({
      date: invoices.date,
      net: sql<number>`sum(case when ${invoices.kind} = 'SI' then ${invoices.total} else -${invoices.total} end)`,
    })
    .from(invoices)
    .where(and(inArray(invoices.kind, ['SI', 'SR']), gte(invoices.date, days[0]), lte(invoices.date, days[days.length - 1]), isNull(invoices.deletedAt)))
    .groupBy(invoices.date)
    .all();
  const map = new Map(rows.map((r) => [r.date, Number(r.net)]));
  return days.map((d) => ({ date: d, value: Math.max(0, map.get(d) ?? 0), weekday: 'SMTWTFS'[parseDate(d).getDay()] }));
}

/** Key figures for the report tiles (Home and Accounts › Reports). */
export function getReportFigures(today: ISODate, ex: Executor = db) {
  const all = balanceBook({ to: today }, ex);
  const month = balanceBook({ from: monthStart(today), to: today }, ex);
  const pl = profitFigures(month);
  const assetLeaves = all.list.filter((a) => a.type === 'A' && !a.isGroup && !a.partyType);
  const arSum = all.groupNatural(all.key('ar').id);
  const totalAssets = assetLeaves.reduce((s, a) => s + all.natural(a.id), 0) + arSum;
  const tbSide = [...all.sides.values()].reduce((s, x) => s + Math.max(0, x.debit - x.credit), 0);
  const postingsCount = Number(ex.select({ n: count() }).from(postings).where(isNull(postings.deletedAt)).get()?.n ?? 0);
  const productCount = Number(ex.select({ n: count() }).from(products).where(isNull(products.deletedAt)).get()?.n ?? 0);
  const monthPurch = listInvoices({ kinds: ['PI', 'PR'], from: monthStart(today), to: today }, ex).reduce(
    (s, i) => s + (i.kind === 'PI' ? i.total : -i.total),
    0,
  );
  return {
    cash: all.nk('cash'),
    bank: all.nk('bank'),
    monthNet: pl.net,
    monthNetSales: pl.netSales,
    monthNetPurchases: monthPurch,
    totalAssets,
    tbSide,
    postingsCount,
    stockValue: all.nk('inv'),
    productCount,
  };
}

export type ReportFigures = ReturnType<typeof getReportFigures>;

export function getDashboard(today: ISODate, ex: Executor = db) {
  const todays = listInvoices({ kinds: ['SI'], from: today, to: today }, ex);
  const week = dailyNetSales(
    Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    ex,
  );
  const customers = listParties('customer', '', ex);
  const suppliers = listParties('supplier', '', ex);
  const low = listProducts({}, ex).filter((p) => p.isLow);

  const recent: RecentItem[] = [
    ...listInvoices({}, ex)
      .slice(0, 5)
      .map((i) => ({ type: 'invoice' as const, id: i.id, kind: i.kind, number: i.number, date: i.date, title: i.partyName, amount: i.total, sign: 0 as const })),
    ...listVouchers({}, ex)
      .slice(0, 5)
      .map((v) => ({
        type: 'voucher' as const,
        id: v.id,
        kind: v.kind,
        number: v.number,
        date: v.date,
        title: v.narration,
        amount: v.amount,
        sign: (v.kind === 'CRV' ? 1 : v.kind === 'CPV' ? -1 : 0) as RecentItem['sign'],
      })),
  ]
    .sort((a, b) => (a.date === b.date ? b.number.localeCompare(a.number) : b.date.localeCompare(a.date)))
    .slice(0, 5);

  return {
    todaySales: todays.reduce((s, i) => s + i.total, 0),
    todayCount: todays.length,
    week,
    receivable: customers.reduce((s, c) => s + c.balance, 0),
    owingCustomers: customers.filter((c) => c.balance > 0).length,
    payable: suppliers.reduce((s, c) => s + c.balance, 0),
    owedSuppliers: suppliers.filter((c) => c.balance > 0).length,
    low,
    recent,
    figures: getReportFigures(today, ex),
  };
}

/** Header stats for the Sales and Purchase tabs. */
export function getTradeStats(side: 'sales' | 'purchase', today: ISODate, ex: Executor = db) {
  const kinds = side === 'sales' ? (['SI', 'SR'] as const) : (['PI', 'PR'] as const);
  const month = listInvoices({ kinds: [...kinds], from: monthStart(today), to: today }, ex);
  const net = month.reduce((s, i) => s + (i.kind === kinds[0] ? i.total : -i.total), 0);
  const outstanding = listParties(side === 'sales' ? 'customer' : 'supplier', '', ex).reduce((s, p) => s + p.balance, 0);
  return { net, outstanding };
}

export function getCashAndBank(ex: Executor = db) {
  const b = balanceBook({}, ex);
  return { cash: b.nk('cash'), bank: b.nk('bank') };
}
