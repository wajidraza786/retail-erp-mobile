/**
 * Drizzle schema (PRD §5). Money columns are integer paisa, quantities are integers,
 * every table has a text uuid id, timestamps and a soft-delete column for phase-2 sync.
 *
 * After changing this file run `npm run db:generate`. Never edit an applied migration.
 */
import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  deletedAt: text('deleted_at'),
};

export const INVOICE_KINDS = ['SI', 'SR', 'PI', 'PR'] as const;
export const VOUCHER_KINDS = ['CRV', 'CPV', 'JV'] as const;
export const ACCOUNT_TYPES = ['A', 'L', 'E', 'I', 'X'] as const;
export const STOCK_SOURCES = ['opening', 'SI', 'SR', 'PI', 'PR'] as const;
export const POSTING_SOURCES = ['opening', 'invoice', 'voucher'] as const;

export type InvoiceKind = (typeof INVOICE_KINDS)[number];
export type VoucherKind = (typeof VOUCHER_KINDS)[number];
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type PostingSource = (typeof POSTING_SOURCES)[number];

// ─── settings (single row, id = 'main') ────────────────────────────────────────
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull().default('My Shop'),
  openingDate: text('opening_date'),
  openingCash: integer('opening_cash').notNull().default(0),
  openingBank: integer('opening_bank').notNull().default(0),
  openingFurniture: integer('opening_furniture').notNull().default(0),
  allowNegativeStock: integer('allow_negative_stock', { mode: 'boolean' }).notNull().default(false),
  nextSI: integer('next_SI').notNull().default(1),
  nextSR: integer('next_SR').notNull().default(1),
  nextPI: integer('next_PI').notNull().default(1),
  nextPR: integer('next_PR').notNull().default(1),
  nextCRV: integer('next_CRV').notNull().default(1),
  nextCPV: integer('next_CPV').notNull().default(1),
  nextJV: integer('next_JV').notNull().default(1),
  seededAt: text('seeded_at'),
  setupCompletedAt: text('setup_completed_at'),
  lastBackupAt: text('last_backup_at'),
  // Printing
  paperWidth: integer('paper_width').notNull().default(80),
  printerName: text('printer_name'),
  printerAddress: text('printer_address'),
  printerCut: integer('printer_cut', { mode: 'boolean' }).notNull().default(true),
  receiptFooter: text('receipt_footer').notNull().default('Thank you for your business'),
  ...timestamps,
});

// ─── parties ───────────────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  openingBalance: integer('opening_balance').notNull().default(0),
  isWalkIn: integer('is_walk_in', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  openingBalance: integer('opening_balance').notNull().default(0),
  ...timestamps,
});

// ─── catalog ───────────────────────────────────────────────────────────────────
export const categories = sqliteTable(
  'categories',
  { id: text('id').primaryKey(), name: text('name').notNull(), ...timestamps },
  (t) => [uniqueIndex('categories_name_uq').on(t.name)],
);

export const brands = sqliteTable(
  'brands',
  { id: text('id').primaryKey(), name: text('name').notNull(), ...timestamps },
  (t) => [uniqueIndex('brands_name_uq').on(t.name)],
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    sku: text('sku').notNull(),
    categoryId: text('category_id').references(() => categories.id),
    brandId: text('brand_id').references(() => brands.id),
    costPrice: integer('cost_price').notNull().default(0),
    salePrice: integer('sale_price').notNull().default(0),
    openingStock: integer('opening_stock').notNull().default(0),
    reorderLevel: integer('reorder_level').notNull().default(0),
    unit: text('unit').notNull().default('pcs'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('products_sku_uq').on(t.sku),
    index('products_category_idx').on(t.categoryId),
    index('products_brand_idx').on(t.brandId),
  ],
);

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    date: text('date').notNull(),
    qty: integer('qty').notNull(),
    rate: integer('rate').notNull().default(0),
    sourceType: text('source_type', { enum: STOCK_SOURCES }).notNull(),
    sourceId: text('source_id'),
    ...timestamps,
  },
  (t) => [index('stock_product_date_idx').on(t.productId, t.date), index('stock_source_idx').on(t.sourceId)],
);

// ─── sales / purchases ─────────────────────────────────────────────────────────
export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: INVOICE_KINDS }).notNull(),
    number: text('number').notNull(),
    date: text('date').notNull(),
    customerId: text('customer_id').references(() => customers.id),
    supplierId: text('supplier_id').references(() => suppliers.id),
    discount: integer('discount').notNull().default(0),
    paidAmount: integer('paid_amount').notNull().default(0),
    // Denormalised totals, written once by the invoice service.
    subtotal: integer('subtotal').notNull().default(0),
    total: integer('total').notNull().default(0),
    costTotal: integer('cost_total').notNull().default(0),
    qtyTotal: integer('qty_total').notNull().default(0),
    notes: text('notes'),
    sourceInvoiceId: text('source_invoice_id').references((): AnySQLiteColumn => invoices.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_kind_number_uq').on(t.kind, t.number),
    index('invoices_kind_date_idx').on(t.kind, t.date),
    index('invoices_customer_idx').on(t.customerId),
    index('invoices_supplier_idx').on(t.supplierId),
  ],
);

export const invoiceLines = sqliteTable(
  'invoice_lines',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    lineNo: integer('line_no').notNull().default(0),
    qty: integer('qty').notNull(),
    rate: integer('rate').notNull(),
    costAtTime: integer('cost_at_time').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('invoice_lines_invoice_idx').on(t.invoiceId), index('invoice_lines_product_idx').on(t.productId)],
);

// ─── vouchers ──────────────────────────────────────────────────────────────────
export const vouchers = sqliteTable(
  'vouchers',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: VOUCHER_KINDS }).notNull(),
    number: text('number').notNull(),
    date: text('date').notNull(),
    narration: text('narration').notNull().default(''),
    /** Counter account for CRV / CPV. */
    accountId: text('account_id').references((): AnySQLiteColumn => accounts.id),
    /** Σ debit, denormalised for lists. */
    amount: integer('amount').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('vouchers_kind_number_uq').on(t.kind, t.number), index('vouchers_kind_date_idx').on(t.kind, t.date)],
);

export const voucherLines = sqliteTable(
  'voucher_lines',
  {
    id: text('id').primaryKey(),
    voucherId: text('voucher_id')
      .notNull()
      .references(() => vouchers.id),
    accountId: text('account_id')
      .notNull()
      .references((): AnySQLiteColumn => accounts.id),
    lineNo: integer('line_no').notNull().default(0),
    debit: integer('debit').notNull().default(0),
    credit: integer('credit').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('voucher_lines_voucher_idx').on(t.voucherId), index('voucher_lines_account_idx').on(t.accountId)],
);

// ─── ledger ────────────────────────────────────────────────────────────────────
export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    type: text('type', { enum: ACCOUNT_TYPES }).notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => accounts.id),
    isGroup: integer('is_group', { mode: 'boolean' }).notNull().default(false),
    systemKey: text('system_key'),
    partyType: text('party_type', { enum: ['customer', 'supplier'] }),
    customerId: text('customer_id').references(() => customers.id),
    supplierId: text('supplier_id').references(() => suppliers.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('accounts_code_uq').on(t.code),
    uniqueIndex('accounts_system_key_uq').on(t.systemKey),
    index('accounts_parent_idx').on(t.parentId),
    index('accounts_customer_idx').on(t.customerId),
    index('accounts_supplier_idx').on(t.supplierId),
  ],
);

export const postings = sqliteTable(
  'postings',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    debit: integer('debit').notNull().default(0),
    credit: integer('credit').notNull().default(0),
    memo: text('memo').notNull().default(''),
    counterpartyLabel: text('counterparty_label'),
    sourceType: text('source_type', { enum: POSTING_SOURCES }).notNull(),
    sourceId: text('source_id'),
    ref: text('ref').notNull().default(''),
    /** Order of the line within its document; keeps running balances stable. */
    lineNo: integer('line_no').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('postings_account_date_idx').on(t.accountId, t.date),
    index('postings_date_idx').on(t.date),
    index('postings_source_idx').on(t.sourceType, t.sourceId),
  ],
);

// ─── relations (for db.query.*) ────────────────────────────────────────────────
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  supplier: one(suppliers, { fields: [invoices.supplierId], references: [suppliers.id] }),
  lines: many(invoiceLines),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceLines.productId], references: [products.id] }),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  account: one(accounts, { fields: [vouchers.accountId], references: [accounts.id] }),
  lines: many(voucherLines),
}));

export const voucherLinesRelations = relations(voucherLines, ({ one }) => ({
  voucher: one(vouchers, { fields: [voucherLines.voucherId], references: [vouchers.id] }),
  account: one(accounts, { fields: [voucherLines.accountId], references: [accounts.id] }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
}));

export type Settings = typeof settings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherLine = typeof voucherLines.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Posting = typeof postings.$inferSelect;
