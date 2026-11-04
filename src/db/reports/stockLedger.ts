import { and, asc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { customers, invoices, stockMovements, suppliers, type InvoiceKind } from '../schema';
import type { Range } from '../queries/balances';
import { listProducts } from '../queries/products';
import { stockFigures } from './stockSummary';

export const MOVEMENT_LABEL: Record<InvoiceKind, string> = { SI: 'Sale', SR: 'Sale return', PI: 'Purchase', PR: 'Purchase return' };

export type MovementRow = {
  id: string;
  date: string;
  kind: InvoiceKind;
  title: string;
  ref: string;
  rate: number;
  qty: number;
  balance: number;
  invoiceId: string;
};

/** Non-opening movements in range for the given products, oldest first. */
function movementsInRange(productIds: string[], range: Range, ex: Executor) {
  if (!productIds.length) return [];
  return ex
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      date: stockMovements.date,
      qty: stockMovements.qty,
      rate: stockMovements.rate,
      kind: invoices.kind,
      number: invoices.number,
      invoiceId: invoices.id,
      customerName: customers.name,
      supplierName: suppliers.name,
    })
    .from(stockMovements)
    .innerJoin(invoices, eq(invoices.id, stockMovements.sourceId))
    .leftJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(suppliers, eq(suppliers.id, invoices.supplierId))
    .where(
      and(
        inArray(stockMovements.productId, productIds),
        ne(stockMovements.sourceType, 'opening'),
        gte(stockMovements.date, range.from),
        lte(stockMovements.date, range.to),
        isNull(stockMovements.deletedAt),
      ),
    )
    .orderBy(asc(stockMovements.date), asc(stockMovements.createdAt))
    .all();
}

function withRunning(rows: ReturnType<typeof movementsInRange>, open: number): MovementRow[] {
  let run = open;
  return rows.map((m) => {
    run += m.qty;
    return {
      id: m.id,
      date: m.date,
      kind: m.kind,
      title: `${MOVEMENT_LABEL[m.kind]} · ${m.customerName ?? m.supplierName ?? '—'}`,
      ref: m.number,
      rate: m.rate,
      qty: m.qty,
      balance: run,
      invoiceId: m.invoiceId,
    };
  });
}

const matches = (r: MovementRow, q: string) => !q || `${r.ref} ${r.title}`.toLowerCase().includes(q);

/** Every movement of one product with running quantity, newest first. */
export function stockLedger(opts: { productId: string; range: Range; search?: string }, ex: Executor = db) {
  const fig = stockFigures(opts.range, ex).get(opts.productId) ?? { open: 0, qtyIn: 0, qtyOut: 0, close: 0 };
  const q = (opts.search ?? '').trim().toLowerCase();
  const rows = withRunning(movementsInRange([opts.productId], opts.range, ex), fig.open)
    .filter((r) => matches(r, q))
    .reverse();
  return { ...fig, rows };
}

/** One card per product with its movements; search matches products or movements. */
export function stockLedgerAll(opts: { range: Range; search?: string }, ex: Executor = db) {
  const figs = stockFigures(opts.range, ex);
  const products = listProducts({}, ex);
  const moves = movementsInRange(products.map((p) => p.id), opts.range, ex);
  const q = (opts.search ?? '').trim().toLowerCase();
  const cards = products
    .map((p) => {
      const f = figs.get(p.id) ?? { open: 0, qtyIn: 0, qtyOut: 0, close: 0 };
      const all = withRunning(moves.filter((m) => m.productId === p.id), f.open);
      const productMatch = !q || `${p.name} ${p.sku} ${p.brandName}`.toLowerCase().includes(q);
      const rows = productMatch ? all : all.filter((r) => matches(r, q));
      return { product: p, ...f, movementCount: all.length, value: f.close * p.costPrice, rows, show: productMatch || rows.length > 0 };
    })
    .filter((c) => c.show);
  const total = (k: 'open' | 'qtyIn' | 'qtyOut' | 'close' | 'value') => cards.reduce((s, c) => s + c[k], 0);
  return { cards, open: total('open'), qtyIn: total('qtyIn'), qtyOut: total('qtyOut'), close: total('close'), value: total('value') };
}
