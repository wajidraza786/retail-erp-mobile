import type { getInvoice, getVoucher } from '@/db/queries/documents';
import { today } from '@/lib/dates';
import { dateLabelLong, fmt, plural } from '@/lib/format';
import { statusLabel } from '@/components/ui/StatusPill';
import { INVOICE_META, VOUCHER_META } from '@/features/shared/meta';

import type { Receipt, ReceiptLine } from './receipt';

type InvoiceData = NonNullable<ReturnType<typeof getInvoice>>;
type VoucherData = NonNullable<ReturnType<typeof getVoucher>>;

/** Shop details printed on every receipt (from Settings). */
export type ReceiptContext = { businessName: string; footer: string };

/** Business name, document title and the date/number block every receipt starts with. */
export function receiptHeader(businessName: string, title: string, meta: [string, string][]): ReceiptLine[] {
  return [
    { t: 'center', text: businessName, size: 'xl' },
    { t: 'center', text: title, size: 'lg' },
    { t: 'hr', style: 'solid' },
    ...meta.map(([label, value]) => ({ t: 'kv' as const, label, value })),
    { t: 'hr' },
  ];
}

export function receiptFooter(note: string): ReceiptLine[] {
  return [
    { t: 'hr' },
    ...(note.trim() ? [{ t: 'center' as const, text: note.trim(), size: 'sm' as const }] : []),
    { t: 'center', text: `Printed ${dateLabelLong(today())}`, size: 'sm' },
  ];
}

export function invoiceReceipt(inv: InvoiceData, ctx: ReceiptContext): Receipt {
  const K = INVOICE_META[inv.kind];
  const qty = inv.lines.reduce((s, l) => s + l.qty, 0);
  return {
    fileName: inv.number,
    title: `${K.title} ${inv.number}`,
    lines: [
      ...receiptHeader(ctx.businessName, K.title, [
        ['No.', inv.number],
        ['Date', dateLabelLong(inv.date)],
        [K.party === 'customer' ? 'Customer' : 'Supplier', inv.partyName],
      ]),
      ...inv.lines.map<ReceiptLine>((l) => ({ t: 'item', name: l.name, detail: `${l.qty} × ${fmt(l.rate)}`, amount: fmt(l.qty * l.rate) })),
      { t: 'hr' },
      { t: 'kv', label: `Subtotal (${plural(qty, 'pc', 'pcs')})`, value: fmt(inv.subtotal) },
      ...(inv.discount ? [{ t: 'kv' as const, label: 'Discount', value: `−${fmt(inv.discount)}` }] : []),
      { t: 'kv', label: 'TOTAL', value: fmt(inv.total), big: true },
      { t: 'hr' },
      { t: 'kv', label: K.paidView, value: fmt(inv.paid) },
      { t: 'kv', label: K.dueLabel, value: fmt(inv.due), bold: true },
      { t: 'kv', label: 'Status', value: inv.status === 'partial' ? 'Partly paid' : statusLabel(inv.status) },
      ...receiptFooter(ctx.footer),
    ],
  };
}

export function voucherReceipt(v: VoucherData, ctx: ReceiptContext): Receipt {
  const K = VOUCHER_META[v.kind];
  const counter = v.lines.find((l) => l.accountId === v.accountId);
  return {
    fileName: v.number,
    title: `${K.title} ${v.number}`,
    columns: { widths: [52, 24, 24], align: ['left', 'right', 'right'] },
    lines: [
      ...receiptHeader(ctx.businessName, K.title, [
        ['No.', v.number],
        ['Date', dateLabelLong(v.date)],
        ...(counter ? ([[K.acctLabel, counter.name]] as [string, string][]) : []),
      ]),
      { t: 'text', text: v.narration },
      { t: 'gap' },
      { t: 'kv', label: 'AMOUNT', value: fmt(v.amount), big: true },
      { t: 'hr' },
      { t: 'row', cells: ['Account', 'Debit', 'Credit'], bold: true },
      ...v.lines.map<ReceiptLine>((l) => ({ t: 'row', cells: [`${l.code} ${l.name}`, l.debit ? fmt(l.debit) : '', l.credit ? fmt(l.credit) : ''] })),
      { t: 'gap' },
      { t: 'gap' },
      { t: 'kv', label: 'Received / paid by', value: '____________' },
      { t: 'gap' },
      { t: 'kv', label: 'Approved by', value: '____________' },
      ...receiptFooter(ctx.footer),
    ],
  };
}
