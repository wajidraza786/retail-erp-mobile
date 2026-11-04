import type { InvoiceKind, VoucherKind } from '@/db/schema';
import type { ReportFigures } from '@/db/queries/dashboard';
import type { IconName } from '@/components/ui/Icon';
import { fmt, fmtQty, fmtSigned } from '@/lib/format';
import { colors } from '@/theme/tokens';

/** Invoice kind copy and colours, verbatim from the prototype. */
export const INVOICE_META: Record<
  InvoiceKind,
  {
    title: string;
    short: string;
    party: 'customer' | 'supplier';
    color: string;
    light: string;
    paidLabel: string;
    paidView: string;
    dueLabel: string;
  }
> = {
  SI: { title: 'Sale Invoice', short: 'sale', party: 'customer', color: colors.sales, light: colors.salesLight, paidLabel: 'Received now', paidView: 'Received', dueLabel: 'Balance due' },
  SR: { title: 'Sale Return', short: 'return', party: 'customer', color: colors.sales, light: colors.salesLight, paidLabel: 'Refund paid now', paidView: 'Refunded in cash', dueLabel: 'Credited to account' },
  PI: { title: 'Purchase Invoice', short: 'purchase', party: 'supplier', color: colors.purchase, light: colors.purchaseLight, paidLabel: 'Paid now', paidView: 'Paid', dueLabel: 'Balance payable' },
  PR: { title: 'Purchase Return', short: 'return', party: 'supplier', color: colors.purchase, light: colors.purchaseLight, paidLabel: 'Refund received now', paidView: 'Refund received', dueLabel: 'Deducted from payable' },
};

export const VOUCHER_META: Record<
  VoucherKind,
  { title: string; short: string; desc: string; color: string; light: string; icon: IconName; acctLabel: string }
> = {
  CRV: { title: 'Cash Receipt Voucher', short: 'Cash Receipt', desc: 'Money came into the cash drawer', color: colors.sales, light: colors.salesLight, icon: 'inArrow', acctLabel: 'Received from' },
  CPV: { title: 'Cash Payment Voucher', short: 'Cash Payment', desc: 'Money went out of the cash drawer', color: colors.report, light: colors.reportLight, icon: 'outArrow', acctLabel: 'Paid to' },
  JV: { title: 'Journal Voucher', short: 'Journal', desc: 'Move amounts between accounts, no cash involved', color: colors.accounts, light: colors.accountsLight, icon: 'swap', acctLabel: 'Account' },
};

/** Amount colour and sign for voucher rows: receipts green +, payments coral −. */
export function voucherAmount(kind: VoucherKind, amount: number) {
  return {
    text: (kind === 'CRV' ? '+' : kind === 'CPV' ? '−' : '') + fmt(amount),
    color: kind === 'CRV' ? colors.sales : kind === 'CPV' ? colors.report : colors.ink,
  };
}

export const REPORT_TYPES = ['cashbook', 'pl', 'bs', 'tb', 'gl', 'sales', 'stock', 'stockledger', 'purchase'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const isReportType = (s: string | undefined): s is ReportType => !!s && (REPORT_TYPES as readonly string[]).includes(s);

export type ReportTileData = { type: ReportType; title: string; desc: string; color: string; figureLabel: string; figure: string };

/** The nine report tiles, in prototype order. */
export function reportTiles(f: ReportFigures | undefined): ReportTileData[] {
  const v = (fn: (x: ReportFigures) => string) => (f ? fn(f) : '—');
  return [
    { type: 'cashbook', title: 'Cash Book', desc: 'Every rupee in and out of the cash drawer', color: colors.sales, figureLabel: 'Cash now', figure: v((x) => fmt(x.cash)) },
    { type: 'pl', title: 'Profit & Loss', desc: 'Did the shop make money this month?', color: colors.report, figureLabel: f && f.monthNet < 0 ? 'Loss' : 'Profit', figure: v((x) => fmtSigned(x.monthNet)) },
    { type: 'bs', title: 'Balance Sheet', desc: 'What the business owns and owes', color: colors.purchase, figureLabel: 'Total assets', figure: v((x) => fmt(x.totalAssets)) },
    { type: 'tb', title: 'Trial Balance', desc: 'Check that all the books add up', color: colors.ink, figureLabel: 'Each side', figure: v((x) => fmt(x.tbSide)) },
    { type: 'gl', title: 'General Ledger', desc: 'Every entry, account by account', color: colors.accounts, figureLabel: 'Postings', figure: v((x) => `${fmtQty(x.postingsCount)} entries`) },
    { type: 'sales', title: 'Sales Report', desc: 'Sales and returns between any two dates', color: colors.sales, figureLabel: 'Net sales', figure: v((x) => fmt(x.monthNetSales)) },
    { type: 'stock', title: 'Stock Summary', desc: 'Opening, in, out and closing stock for every product', color: colors.inventoryDark, figureLabel: 'Stock value', figure: v((x) => fmt(x.stockValue)) },
    { type: 'stockledger', title: 'Stock Ledger', desc: 'Every movement of one product with running quantity', color: colors.stockLedger, figureLabel: 'Products', figure: v((x) => `${x.productCount} items`) },
    { type: 'purchase', title: 'Purchase Report', desc: 'Purchases and returns between any two dates', color: colors.purchase, figureLabel: 'Net purchases', figure: v((x) => fmt(x.monthNetPurchases)) },
  ];
}

export const reportMeta = (type: ReportType) => reportTiles(undefined).find((r) => r.type === type)!;
