import * as Crypto from 'expo-crypto';
import { and, eq, ne } from 'drizzle-orm';

import { nowTimestamp, today, type ISODate } from '@/lib/dates';
import type { Paisa } from '@/lib/money';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { products, stockMovements } from '../schema';
import { getSystemAccounts } from './accounts';
import { ValidationError, type FieldError } from './errors';
import { buildStockOpening } from './ledger';
import { writePostings } from './postings';

export type ProductInput = {
  id?: string | null;
  name: string;
  sku?: string;
  categoryId: string | null;
  brandId: string | null;
  costPrice: Paisa;
  salePrice: Paisa;
  /** Only used on create (v1: opening stock is not editable afterwards). */
  openingStock?: number;
  reorderLevel: number;
  unit?: string;
  date?: ISODate;
};

function autoSku(name: string): string {
  const prefix = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'SKU';
  return `${prefix}-${Crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

/** Creates (with opening stock movement + posting) or updates a product. Returns its id. */
export function saveProductTx(tx: Executor, input: ProductInput): string {
  const errors: FieldError[] = [];
  const name = input.name.trim();
  if (!name) errors.push({ field: 'name', message: 'Give the product a name.' });
  if (!(input.salePrice > 0)) errors.push({ field: 'salePrice', message: 'Enter a sale price.' });
  if (!(input.costPrice > 0)) errors.push({ field: 'costPrice', message: 'Enter a cost price.' });
  if ((input.openingStock ?? 0) < 0) errors.push({ field: 'openingStock', message: 'Opening stock cannot be negative.' });
  if (input.reorderLevel < 0) errors.push({ field: 'reorderLevel', message: 'Alert level cannot be negative.' });

  const sku = (input.sku ?? '').trim().toUpperCase() || autoSku(name);
  const dup = tx
    .select({ id: products.id })
    .from(products)
    .where(input.id ? and(eq(products.sku, sku), ne(products.id, input.id)) : eq(products.sku, sku))
    .get();
  if (dup) errors.push({ field: 'sku', message: `SKU ${sku} is already used by another product.` });
  if (errors.length) throw new ValidationError(errors);

  const fields = {
    name,
    sku,
    categoryId: input.categoryId,
    brandId: input.brandId,
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    reorderLevel: input.reorderLevel,
    unit: input.unit ?? 'pcs',
  };

  if (input.id) {
    tx.update(products)
      .set({ ...fields, updatedAt: nowTimestamp() })
      .where(eq(products.id, input.id))
      .run();
    return input.id;
  }

  const id = Crypto.randomUUID();
  const opening = input.openingStock ?? 0;
  const date = input.date ?? today();
  tx.insert(products)
    .values({ id, ...fields, openingStock: opening })
    .run();
  if (opening > 0) {
    tx.insert(stockMovements)
      .values({ id: Crypto.randomUUID(), productId: id, date, qty: opening, rate: input.costPrice, sourceType: 'opening', sourceId: id })
      .run();
    writePostings(tx, buildStockOpening(opening, input.costPrice, getSystemAccounts(tx)), {
      date,
      sourceType: 'opening',
      sourceId: id,
      ref: 'Opening',
    });
  }
  return id;
}

export function saveProduct(input: ProductInput): string {
  const id = db.transaction((tx) => saveProductTx(tx, input));
  notifyDataChanged();
  return id;
}
