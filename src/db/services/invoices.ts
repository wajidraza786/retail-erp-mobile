import * as Crypto from 'expo-crypto';
import { eq, inArray } from 'drizzle-orm';

import { today, type ISODate } from '@/lib/dates';
import type { Paisa } from '@/lib/money';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { stockOnHand } from '../queries/stock';
import { customers, invoiceLines, invoices, products, stockMovements, suppliers, type InvoiceKind } from '../schema';
import { getPartyAccount, getSystemAccounts } from './accounts';
import { ValidationError, type FieldError } from './errors';
import { STOCK_SIGN, buildInvoicePostings, invoiceTotals } from './ledger';
import { takeNextNumber } from './numbering';
import { writePostings } from './postings';
import { getSettings } from './settings';

export const isCustomerKind = (k: InvoiceKind) => k === 'SI' || k === 'SR';
export const isReturnKind = (k: InvoiceKind) => k === 'SR' || k === 'PR';
/** SI and PR take stock out. */
export const isOutflowKind = (k: InvoiceKind) => k === 'SI' || k === 'PR';

export type InvoiceLineInput = { productId: string; qty: number; rate: Paisa };

export type InvoiceInput = {
  kind: InvoiceKind;
  date?: ISODate;
  partyId: string | null;
  lines: InvoiceLineInput[];
  discount: Paisa;
  paid: Paisa;
  notes?: string;
  sourceInvoiceId?: string | null;
};

/**
 * Validates, numbers and saves an invoice with its lines, stock movements and postings
 * in the caller's transaction. Returns `{ id, number }`.
 */
export function saveInvoiceTx(tx: Executor, input: InvoiceInput): { id: string; number: string } {
  const { kind } = input;
  const partyType = isCustomerKind(kind) ? 'customer' : 'supplier';
  const errors: FieldError[] = [];

  let partyName = '';
  if (!input.partyId) {
    errors.push({ field: 'partyId', message: `Choose a ${partyType} first.` });
  } else {
    const table = partyType === 'customer' ? customers : suppliers;
    const party = tx.select({ name: table.name }).from(table).where(eq(table.id, input.partyId)).get();
    if (!party) errors.push({ field: 'partyId', message: `That ${partyType} no longer exists.` });
    else partyName = party.name;
  }

  const lines = input.lines.filter((l) => l.qty > 0);
  if (!lines.length) errors.push({ field: 'lines', message: 'Add at least one product.' });
  lines.forEach((l, i) => {
    if (!Number.isInteger(l.qty)) errors.push({ field: `lines[${i}].qty`, message: 'Quantities must be whole numbers.' });
    if (l.rate < 0) errors.push({ field: `lines[${i}].rate`, message: 'Rates cannot be negative.' });
  });
  if (input.discount < 0) errors.push({ field: 'discount', message: 'Discount cannot be negative.' });
  if (input.paid < 0) errors.push({ field: 'paid', message: 'Paid amount cannot be negative.' });

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const productRows = productIds.length
    ? tx.select({ id: products.id, name: products.name, cost: products.costPrice }).from(products).where(inArray(products.id, productIds)).all()
    : [];
  const productById = new Map(productRows.map((p) => [p.id, p]));
  productIds.forEach((id) => {
    if (!productById.has(id)) errors.push({ field: 'lines', message: 'A product on this invoice no longer exists.' });
  });

  if (isOutflowKind(kind) && !getSettings(tx).allowNegativeStock && productIds.length) {
    const onHand = stockOnHand(tx, productIds);
    const wanted = new Map<string, number>();
    lines.forEach((l) => wanted.set(l.productId, (wanted.get(l.productId) ?? 0) + l.qty));
    lines.forEach((l, i) => {
      const have = onHand.get(l.productId) ?? 0;
      const want = wanted.get(l.productId) ?? 0;
      if (want > have && wanted.has(l.productId)) {
        errors.push({ field: `lines[${i}].qty`, message: `${productById.get(l.productId)?.name ?? 'Product'}: only ${have} in stock.` });
        wanted.delete(l.productId); // one message per product
      }
    });
  }
  if (errors.length) throw new ValidationError(errors);

  const priced = lines.map((l) => ({ ...l, costAtTime: productById.get(l.productId)!.cost }));
  const t = invoiceTotals({ lines: priced, discount: input.discount, paid: input.paid });
  const id = Crypto.randomUUID();
  const number = takeNextNumber(tx, kind);
  const date = input.date ?? today();

  tx.insert(invoices)
    .values({
      id,
      kind,
      number,
      date,
      customerId: partyType === 'customer' ? input.partyId : null,
      supplierId: partyType === 'supplier' ? input.partyId : null,
      discount: Math.max(0, input.discount),
      paidAmount: t.paid,
      subtotal: t.subtotal,
      total: t.total,
      costTotal: t.cost,
      qtyTotal: t.qty,
      notes: input.notes?.trim() || null,
      sourceInvoiceId: input.sourceInvoiceId ?? null,
    })
    .run();

  tx.insert(invoiceLines)
    .values(priced.map((l, i) => ({ id: Crypto.randomUUID(), invoiceId: id, productId: l.productId, lineNo: i, qty: l.qty, rate: l.rate, costAtTime: l.costAtTime })))
    .run();

  tx.insert(stockMovements)
    .values(
      priced.map((l) => ({
        id: Crypto.randomUUID(),
        productId: l.productId,
        date,
        qty: STOCK_SIGN[kind] * l.qty,
        rate: l.rate,
        sourceType: kind,
        sourceId: id,
      })),
    )
    .run();

  const partyAccount = getPartyAccount(tx, partyType, input.partyId!);
  const postingLines = buildInvoicePostings(
    { kind, total: t.total, paid: t.paid, cost: t.cost, partyAccountId: partyAccount.id, partyName },
    getSystemAccounts(tx),
  );
  writePostings(tx, postingLines, { date, sourceType: 'invoice', sourceId: id, ref: number });

  return { id, number };
}

export function saveInvoice(input: InvoiceInput) {
  const result = db.transaction((tx) => saveInvoiceTx(tx, input));
  notifyDataChanged();
  return result;
}

export type ReturnDraft = {
  kind: InvoiceKind;
  partyId: string | null;
  lines: InvoiceLineInput[];
  sourceInvoiceId: string;
};

/** A return prefilled from an invoice: same party, same lines, linked by `source_invoice`. */
export function buildReturnDraft(ex: Executor, invoiceId: string): ReturnDraft {
  const inv = ex.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!inv) throw new Error('Invoice not found');
  const lines = ex.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId)).orderBy(invoiceLines.lineNo).all();
  return {
    kind: inv.kind === 'SI' ? 'SR' : 'PR',
    partyId: inv.customerId ?? inv.supplierId,
    lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: l.rate })),
    sourceInvoiceId: inv.id,
  };
}
