import { eq, inArray } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { invoiceLines, products } from '../schema';
import type { Range } from '../queries/balances';
import { listInvoices, type InvoiceRowData } from '../queries/documents';
import { listBrands, listCategories } from '../queries/products';

export type TradeSide = 'sales' | 'purchase';
export type TradeGroup = 'invoices' | 'products' | 'parties';

/**
 * Sales or purchase report for a range. Returns count negative; product amounts are after
 * pro-rata invoice discount.
 */
export function salesPurchaseReport(opts: { side: TradeSide; range: Range; search?: string }, ex: Executor = db) {
  const [K1, K2] = opts.side === 'sales' ? (['SI', 'SR'] as const) : (['PI', 'PR'] as const);
  const all = listInvoices({ kinds: [K1, K2], from: opts.range.from, to: opts.range.to }, ex);
  const lines = all.length
    ? ex
        .select({
          invoiceId: invoiceLines.invoiceId,
          productId: invoiceLines.productId,
          qty: invoiceLines.qty,
          rate: invoiceLines.rate,
          cost: invoiceLines.costAtTime,
          name: products.name,
          sku: products.sku,
          brandId: products.brandId,
          categoryId: products.categoryId,
        })
        .from(invoiceLines)
        .innerJoin(products, eq(products.id, invoiceLines.productId))
        .where(inArray(invoiceLines.invoiceId, all.map((i) => i.id)))
        .all()
    : [];

  const q = (opts.search ?? '').trim().toLowerCase();
  const docMatch = (i: InvoiceRowData) => !q || `${i.number} ${i.partyName}`.toLowerCase().includes(q);
  const lineMatch = (l: (typeof lines)[number]) => !q || `${l.name} ${l.sku}`.toLowerCase().includes(q);
  const docs = all.filter((i) => docMatch(i) || lines.some((l) => l.invoiceId === i.id && lineMatch(l)));
  const sign = (i: InvoiceRowData) => (i.kind === K1 ? 1 : -1);

  const invoicesOnly = docs.filter((i) => i.kind === K1);
  const gross = invoicesOnly.reduce((s, i) => s + i.total, 0);
  const returns = docs.filter((i) => i.kind === K2).reduce((s, i) => s + i.total, 0);
  const settled = docs.reduce((s, i) => s + sign(i) * i.paid, 0);
  const due = invoicesOnly.reduce((s, i) => s + i.due, 0);
  const cost = docs.reduce((s, i) => s + sign(i) * i.cost, 0);
  const net = gross - returns;

  // Group by product.
  const brandName = new Map(listBrands(ex).map((b) => [b.id, b.name]));
  const catIndex = new Map(listCategories(ex).map((c, i) => [c.id, i]));
  const byProduct = new Map<string, { productId: string; name: string; brand: string; categoryIndex: number; qty: number; amount: number; cost: number }>();
  docs.forEach((inv) => {
    const dm = docMatch(inv);
    const factor = sign(inv) * (1 - inv.discount / Math.max(1, inv.subtotal));
    lines
      .filter((l) => l.invoiceId === inv.id && (dm || lineMatch(l)))
      .forEach((l) => {
        const g = byProduct.get(l.productId) ?? {
          productId: l.productId,
          name: l.name,
          brand: (l.brandId && brandName.get(l.brandId)) || '—',
          categoryIndex: (l.categoryId && catIndex.get(l.categoryId)) || 0,
          qty: 0,
          amount: 0,
          cost: 0,
        };
        g.qty += sign(inv) * l.qty;
        g.amount += Math.round(factor * l.qty * l.rate);
        g.cost += sign(inv) * l.qty * l.cost;
        byProduct.set(l.productId, g);
      });
  });

  // Group by party.
  const byParty = new Map<string, { partyId: string; name: string; invoices: number; amount: number; due: number }>();
  docs.forEach((i) => {
    const key = i.partyId ?? '—';
    const g = byParty.get(key) ?? { partyId: key, name: i.partyName, invoices: 0, amount: 0, due: 0 };
    if (i.kind === K1) {
      g.invoices += 1;
      g.due += i.due;
    }
    g.amount += sign(i) * i.total;
    byParty.set(key, g);
  });

  return {
    invoiceKind: K1,
    returnKind: K2,
    docs,
    invoiceCount: invoicesOnly.length,
    returnCount: docs.length - invoicesOnly.length,
    gross,
    returns,
    net,
    settled,
    due,
    grossProfit: net - cost,
    avgInvoice: invoicesOnly.length ? Math.round(gross / invoicesOnly.length) : 0,
    products: [...byProduct.values()].sort((a, b) => b.amount - a.amount),
    parties: [...byParty.values()].sort((a, b) => b.amount - a.amount),
  };
}
