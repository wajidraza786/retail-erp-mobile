import { and, inArray, isNull, sql } from 'drizzle-orm';

import type { Executor } from '../client';
import { stockMovements } from '../schema';

/** Stock on hand = Σ movements (opening stock is itself a movement). */
export function stockOnHand(ex: Executor, productIds?: string[]): Map<string, number> {
  const where = productIds
    ? and(isNull(stockMovements.deletedAt), inArray(stockMovements.productId, productIds))
    : isNull(stockMovements.deletedAt);
  const rows = ex
    .select({ productId: stockMovements.productId, qty: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` })
    .from(stockMovements)
    .where(where)
    .groupBy(stockMovements.productId)
    .all();
  return new Map(rows.map((r) => [r.productId, Number(r.qty)]));
}
