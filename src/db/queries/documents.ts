import { and, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import { db, type Executor } from '../client';
import {
  accounts,
  customers,
  invoiceLines,
  invoices,
  products,
  suppliers,
  voucherLines,
  vouchers,
  type InvoiceKind,
  type VoucherKind,
} from '../schema';
import { invoiceStatus, type InvoiceStatus } from '../services/ledger';

export type InvoiceRowData = {
  id: string;
  kind: InvoiceKind;
  number: string;
  date: string;
  partyId: string | null;
  partyName: string;
  partyPhone: string | null;
  qty: number;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  cost: number;
  status: InvoiceStatus;
};

/** Invoices of the given kinds, newest first. `search` matches party name and number. */
export function listInvoices(
  opts: { kinds?: InvoiceKind[]; ids?: string[]; search?: string; from?: string; to?: string },
  ex: Executor = db,
): InvoiceRowData[] {
  const rows = ex
    .select({ inv: invoices, customerName: customers.name, supplierName: suppliers.name, customerPhone: customers.phone, supplierPhone: suppliers.phone })
    .from(invoices)
    .leftJoin(customers, eq(customers.id, invoices.customerId))
    .leftJoin(suppliers, eq(suppliers.id, invoices.supplierId))
    .where(
      and(
        isNull(invoices.deletedAt),
        opts.kinds ? inArray(invoices.kind, opts.kinds) : undefined,
        opts.ids ? inArray(invoices.id, opts.ids) : undefined,
        opts.from ? gte(invoices.date, opts.from) : undefined,
        opts.to ? lte(invoices.date, opts.to) : undefined,
      ),
    )
    .orderBy(desc(invoices.date), desc(invoices.number))
    .all();
  const q = (opts.search ?? '').trim().toLowerCase();
  return rows
    .map(({ inv, customerName, supplierName, customerPhone, supplierPhone }) => ({
      id: inv.id,
      kind: inv.kind,
      number: inv.number,
      date: inv.date,
      partyId: inv.customerId ?? inv.supplierId,
      partyName: customerName ?? supplierName ?? '—',
      partyPhone: customerPhone ?? supplierPhone ?? null,
      qty: inv.qtyTotal,
      subtotal: inv.subtotal,
      discount: inv.discount,
      total: inv.total,
      paid: inv.paidAmount,
      due: inv.total - inv.paidAmount,
      cost: inv.costTotal,
      status: invoiceStatus(inv.kind, inv.total, inv.paidAmount),
    }))
    .filter((r) => !q || `${r.partyName} ${r.number}`.toLowerCase().includes(q));
}

export function getInvoice(id: string, ex: Executor = db) {
  const row = listInvoices({ ids: [id] }, ex)[0];
  if (!row) return null;
  const lines = ex
    .select({ id: invoiceLines.id, productId: invoiceLines.productId, name: products.name, qty: invoiceLines.qty, rate: invoiceLines.rate })
    .from(invoiceLines)
    .innerJoin(products, eq(products.id, invoiceLines.productId))
    .where(eq(invoiceLines.invoiceId, id))
    .orderBy(invoiceLines.lineNo)
    .all();
  const accountCol = row.kind === 'SI' || row.kind === 'SR' ? accounts.customerId : accounts.supplierId;
  const partyAccount = row.partyId ? ex.select({ id: accounts.id }).from(accounts).where(eq(accountCol, row.partyId)).get() : undefined;
  return { ...row, lines, partyAccountId: partyAccount?.id ?? null };
}

export type VoucherRowData = {
  id: string;
  kind: VoucherKind;
  number: string;
  date: string;
  narration: string;
  amount: number;
  /** "Zainab Traders" for CRV/CPV, "Meezan Bank → Cash in Hand" for JV. */
  accountsLabel: string;
};

export function listVouchers(opts: { kind?: VoucherKind | 'all' } = {}, ex: Executor = db): VoucherRowData[] {
  const rows = ex
    .select()
    .from(vouchers)
    .where(and(isNull(vouchers.deletedAt), opts.kind && opts.kind !== 'all' ? eq(vouchers.kind, opts.kind) : undefined))
    .orderBy(desc(vouchers.date), desc(vouchers.number))
    .all();
  if (!rows.length) return [];
  const lines = ex
    .select({ voucherId: voucherLines.voucherId, name: accounts.name, accountId: accounts.id, lineNo: voucherLines.lineNo })
    .from(voucherLines)
    .innerJoin(accounts, eq(accounts.id, voucherLines.accountId))
    .where(inArray(voucherLines.voucherId, rows.map((r) => r.id)))
    .orderBy(voucherLines.lineNo)
    .all();
  return rows.map((v) => {
    const mine = lines.filter((l) => l.voucherId === v.id);
    const label = v.kind === 'JV' ? mine.map((l) => l.name).join(' → ') : (mine.find((l) => l.accountId === v.accountId)?.name ?? '');
    return { id: v.id, kind: v.kind, number: v.number, date: v.date, narration: v.narration, amount: v.amount, accountsLabel: label };
  });
}

export function getVoucher(id: string, ex: Executor = db) {
  const v = ex.select().from(vouchers).where(eq(vouchers.id, id)).get();
  if (!v) return null;
  // Phone of the customer / supplier on a CRV or CPV, for WhatsApp.
  const party = v.accountId
    ? ex
        .select({ customerPhone: customers.phone, supplierPhone: suppliers.phone })
        .from(accounts)
        .leftJoin(customers, eq(customers.id, accounts.customerId))
        .leftJoin(suppliers, eq(suppliers.id, accounts.supplierId))
        .where(eq(accounts.id, v.accountId))
        .get()
    : undefined;
  const lines = ex
    .select({ accountId: accounts.id, name: accounts.name, code: accounts.code, debit: voucherLines.debit, credit: voucherLines.credit })
    .from(voucherLines)
    .innerJoin(accounts, eq(accounts.id, voucherLines.accountId))
    .where(eq(voucherLines.voucherId, id))
    .orderBy(voucherLines.lineNo)
    .all();
  return { ...v, lines, partyPhone: party?.customerPhone ?? party?.supplierPhone ?? null };
}
