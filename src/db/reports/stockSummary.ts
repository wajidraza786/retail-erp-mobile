import { and, isNull, lte, or, eq, sql } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { stockMovements } from '../schema';
import type { Range } from '../queries/balances';
import { listProducts, type ProductRowData } from '../queries/products';

export type StockFigures = { open: number; qtyIn: number; qtyOut: number; close: number };

/**
 * opening(lo) = Σ movements before lo (opening stock counts as opening)
 * in / out    = Σ positive / |negative| non-opening movements in [lo, hi]
 * closing     = opening + in − out
 */
export function stockFigures(range: Range, ex: Executor = db): Map<string, StockFigures> {
  const { from: lo, to: hi } = range;
  const m = stockMovements;
  const isOpening = sql`(${m.date} < ${lo} or ${m.sourceType} = 'opening')`;
  const inRange = sql`(${m.sourceType} != 'opening' and ${m.date} >= ${lo} and ${m.date} <= ${hi})`;
  const rows = ex
    .select({
      productId: m.productId,
      open: sql<number>`coalesce(sum(case when ${isOpening} then ${m.qty} else 0 end), 0)`,
      qtyIn: sql<number>`coalesce(sum(case when ${inRange} and ${m.qty} > 0 then ${m.qty} else 0 end), 0)`,
      qtyOut: sql<number>`coalesce(sum(case when ${inRange} and ${m.qty} < 0 then -${m.qty} else 0 end), 0)`,
    })
    .from(m)
    .where(and(isNull(m.deletedAt), or(lte(m.date, hi), eq(m.sourceType, 'opening'))))
    .groupBy(m.productId)
    .all();
  return new Map(
    rows.map((r) => {
      const open = Number(r.open);
      const qtyIn = Number(r.qtyIn);
      const qtyOut = Number(r.qtyOut);
      return [r.productId, { open, qtyIn, qtyOut, close: open + qtyIn - qtyOut }];
    }),
  );
}

export type StockSummaryRow = ProductRowData & StockFigures & { value: number; isLowClose: boolean };

export function stockSummary(opts: { range: Range; categoryId?: string | null; search?: string }, ex: Executor = db) {
  const figs = stockFigures(opts.range, ex);
  const rows: StockSummaryRow[] = listProducts({ categoryId: opts.categoryId, search: opts.search }, ex).map((p) => {
    const f = figs.get(p.id) ?? { open: 0, qtyIn: 0, qtyOut: 0, close: 0 };
    return { ...p, ...f, value: f.close * p.costPrice, isLowClose: f.close <= p.reorderLevel };
  });
  const sum = (k: keyof StockFigures | 'value') => rows.reduce((s, r) => s + r[k], 0);
  return {
    rows,
    totals: { open: sum('open'), qtyIn: sum('qtyIn'), qtyOut: sum('qtyOut'), close: sum('close'), value: sum('value') },
    lowCount: rows.filter((r) => r.isLowClose).length,
  };
}
