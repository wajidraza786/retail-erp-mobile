import { and, eq, gte, isNull, sql } from 'drizzle-orm';

import { monthStart } from '@/lib/dates';

import { db, type Executor } from '../client';
import { brands, categories, invoiceLines, invoices, products, type Brand, type Category } from '../schema';
import { stockOnHand } from './stock';

export type ProductRowData = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  categoryName: string;
  categoryIndex: number;
  brandId: string | null;
  brandName: string;
  costPrice: number;
  salePrice: number;
  reorderLevel: number;
  openingStock: number;
  stock: number;
  isLow: boolean;
};

export function listCategories(ex: Executor = db): Category[] {
  return ex.select().from(categories).where(isNull(categories.deletedAt)).orderBy(categories.createdAt).all();
}

export function listBrands(ex: Executor = db): Brand[] {
  return ex.select().from(brands).where(isNull(brands.deletedAt)).orderBy(brands.createdAt).all();
}

/** Products with stock on hand. `search` matches name, SKU and brand. */
export function listProducts(opts: { categoryId?: string | null; search?: string } = {}, ex: Executor = db): ProductRowData[] {
  const cats = listCategories(ex);
  const catIndex = new Map(cats.map((c, i) => [c.id, i]));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const brandName = new Map(listBrands(ex).map((b) => [b.id, b.name]));
  const stock = stockOnHand(ex);
  const q = (opts.search ?? '').trim().toLowerCase();
  return ex
    .select()
    .from(products)
    .where(and(isNull(products.deletedAt), opts.categoryId ? eq(products.categoryId, opts.categoryId) : undefined))
    .orderBy(products.createdAt)
    .all()
    .map((p) => {
      const s = stock.get(p.id) ?? 0;
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryId: p.categoryId,
        categoryName: (p.categoryId && catName.get(p.categoryId)) || '—',
        categoryIndex: (p.categoryId && catIndex.get(p.categoryId)) || 0,
        brandId: p.brandId,
        brandName: (p.brandId && brandName.get(p.brandId)) || '—',
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        reorderLevel: p.reorderLevel,
        openingStock: p.openingStock,
        stock: s,
        isLow: s <= p.reorderLevel,
      };
    })
    .filter((p) => !q || `${p.name} ${p.sku} ${p.brandName}`.toLowerCase().includes(q));
}

export type GroupRowData = { id: string; name: string; index: number; productCount: number; pcs: number; value: number };

/** Categories or brands with product count, pieces and stock value at cost. */
export function listGroups(kind: 'category' | 'brand', search = '', ex: Executor = db): GroupRowData[] {
  const groups = kind === 'category' ? listCategories(ex) : listBrands(ex);
  const ps = listProducts({}, ex);
  const q = search.trim().toLowerCase();
  return groups
    .map((g, index) => {
      const mine = ps.filter((p) => (kind === 'category' ? p.categoryId : p.brandId) === g.id);
      return {
        id: g.id,
        name: g.name,
        index,
        productCount: mine.length,
        pcs: mine.reduce((s, p) => s + p.stock, 0),
        value: mine.reduce((s, p) => s + p.stock * p.costPrice, 0),
      };
    })
    .filter((g) => !q || g.name.toLowerCase().includes(q));
}

export function getProduct(id: string, ex: Executor = db) {
  const p = ex.select().from(products).where(eq(products.id, id)).get();
  if (!p) return null;
  const stock = stockOnHand(ex, [id]).get(id) ?? 0;
  const sold = ex
    .select({ qty: sql<number>`coalesce(sum(${invoiceLines.qty}), 0)` })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(and(eq(invoiceLines.productId, id), eq(invoices.kind, 'SI'), gte(invoices.date, monthStart()), isNull(invoices.deletedAt)))
    .get();
  return { ...p, stock, soldThisMonth: Number(sold?.qty ?? 0) };
}
