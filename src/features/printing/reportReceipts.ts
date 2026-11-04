import type { Range } from '@/db/queries/balances';
import type { balanceSheet } from '@/db/reports/balanceSheet';
import type { cashBook } from '@/db/reports/cashBook';
import type { generalLedger } from '@/db/reports/generalLedger';
import type { profitLoss } from '@/db/reports/profitLoss';
import type { salesPurchaseReport, TradeGroup, TradeSide } from '@/db/reports/salesPurchase';
import type { stockLedger, stockLedgerAll } from '@/db/reports/stockLedger';
import type { stockSummary } from '@/db/reports/stockSummary';
import type { trialBalance } from '@/db/reports/trialBalance';
import type { ProductRowData } from '@/db/queries/products';
import { dateLabel, dateLabelLong, fmt, fmtParen, fmtQty, fmtSigned, rangeLabel } from '@/lib/format';

import { receiptFooter, receiptHeader } from './documentReceipts';
import type { Receipt, ReceiptLine } from './receipt';

const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
const period = (r: Range) => rangeLabel(r.from, r.to);
const kv = (label: string, value: string, o: { bold?: boolean; big?: boolean } = {}): ReceiptLine => ({ t: 'kv', label, value, ...o });
const signedQty = (n: number, sign: '+' | '−') => (n ? `${sign}${fmtQty(n)}` : '0');

function report(title: string, business: string, meta: [string, string][], lines: ReceiptLine[], columns?: Receipt['columns'], fileDate?: string): Receipt {
  return {
    fileName: `${slug(title)}-${fileDate ?? new Date().toISOString().slice(0, 10)}`,
    title,
    columns,
    lines: [...receiptHeader(business, title, meta), ...lines, ...receiptFooter('End of report')],
  };
}

export function cashBookReceipt(d: ReturnType<typeof cashBook>, range: Range, business: string): Receipt {
  const rows = [...d.rows].reverse();
  return report(
    'Cash Book',
    business,
    [['Period', period(range)]],
    [
      kv('Opening cash', fmt(d.opening)),
      kv('Money in', fmt(d.moneyIn)),
      kv('Money out', fmt(d.moneyOut)),
      kv('Closing cash', fmt(d.closing), { big: true }),
      { t: 'hr' },
      { t: 'row', cells: ['Date', 'Particulars', 'Amount', 'Balance'], bold: true },
      ...rows.map<ReceiptLine>((r) => ({ t: 'row', cells: [dateLabel(r.date), `${r.ref} ${r.who}`, fmtSigned(r.amount), fmt(r.running)] })),
      ...(rows.length ? [] : [{ t: 'text' as const, text: 'No cash entries in this period.', muted: true }]),
    ],
    { widths: [15, 39, 23, 23], align: ['left', 'left', 'right', 'right'] },
    range.to,
  );
}

export function profitLossReceipt(d: ReturnType<typeof profitLoss>, range: Range, business: string): Receipt {
  return report(
    'Profit & Loss',
    business,
    [['Period', period(range)]],
    [
      { t: 'section', text: 'Revenue' },
      kv('Sales', fmt(d.sales)),
      kv('Less: sales returns', fmtParen(d.salesRet)),
      kv('Net sales', fmt(d.netSales), { bold: true }),
      kv('Cost of goods sold', fmtParen(-d.cogs)),
      kv('Gross profit', fmtSigned(d.gross), { bold: true }),
      { t: 'hr' },
      { t: 'section', text: 'Expenses' },
      ...d.expenses.map((e) => kv(e.account.name, fmt(e.amount))),
      kv('Total expenses', fmt(d.totalExpenses), { bold: true }),
      { t: 'hr' },
      kv('Other income', fmt(d.otherIncome)),
      kv(d.net >= 0 ? 'NET PROFIT' : 'NET LOSS', fmtSigned(d.net), { big: true }),
      ...(d.margin !== null ? [kv('Margin', `${d.margin}% of sales`)] : []),
    ],
    undefined,
    range.to,
  );
}

export function balanceSheetReceipt(d: ReturnType<typeof balanceSheet>, asOf: string, business: string): Receipt {
  const lines = (ls: { label: string; amount: number }[]) => ls.map((l) => kv(l.label, l.amount < 0 ? fmtParen(l.amount) : fmt(l.amount)));
  return report(
    'Balance Sheet',
    business,
    [['As of', dateLabelLong(asOf)]],
    [
      { t: 'section', text: 'What you own' },
      ...lines(d.assets),
      kv('Total assets', fmt(d.totalAssets), { bold: true }),
      { t: 'hr' },
      { t: 'section', text: 'What you owe' },
      ...lines(d.liabilities),
      kv('Total liabilities', fmt(d.totalLiabilities), { bold: true }),
      { t: 'hr' },
      { t: 'section', text: "Owner's equity" },
      ...lines(d.equity),
      kv('Total equity', fmtSigned(d.totalEquity), { bold: true }),
      { t: 'hr', style: 'double' },
      kv('Liabilities + equity', fmt(d.totalLiabilities + d.totalEquity), { big: true }),
      { t: 'center', text: d.difference === 0 ? 'Balanced: assets = liabilities + equity' : `Out of balance by ${fmt(d.difference)}`, size: 'sm' },
    ],
    undefined,
    asOf,
  );
}

export function trialBalanceReceipt(d: ReturnType<typeof trialBalance>, asOf: string, business: string): Receipt {
  return report(
    'Trial Balance',
    business,
    [['As of', dateLabelLong(asOf)]],
    [
      { t: 'row', cells: ['Account', 'Debit', 'Credit'], bold: true },
      ...d.rows.map<ReceiptLine>((r) => ({ t: 'row', cells: [`${r.code} ${r.name}`, r.debit ? fmt(r.debit) : '', r.credit ? fmt(r.credit) : ''] })),
      { t: 'hr' },
      { t: 'row', cells: ['Total', fmt(d.debit), fmt(d.credit)], bold: true },
      { t: 'center', text: d.balanced ? `Books are balanced · ${d.rows.length} accounts` : `Difference ${fmt(d.debit - d.credit)}`, size: 'sm' },
    ],
    { widths: [46, 27, 27], align: ['left', 'right', 'right'] },
    asOf,
  );
}

export function generalLedgerReceipt(d: ReturnType<typeof generalLedger>, business: string): Receipt {
  return report(
    'General Ledger',
    business,
    [['Accounts', String(d.accounts.length)]],
    [
      { t: 'row', cells: ['Account', 'Debit', 'Credit', 'Closing'], bold: true },
      ...d.accounts.map<ReceiptLine>((a) => ({ t: 'row', cells: [`${a.code} ${a.name}`, fmt(a.debit), fmt(a.credit), `${fmtParen(a.closing)} ${a.side}`] })),
      { t: 'hr' },
      { t: 'row', cells: ['Total', fmt(d.totalDebit), fmt(d.totalCredit), ''], bold: true },
    ],
    { widths: [34, 21, 21, 24], align: ['left', 'right', 'right', 'right'] },
  );
}

export function tradeReceipt(d: ReturnType<typeof salesPurchaseReport>, side: TradeSide, group: TradeGroup, range: Range, business: string): Receipt {
  const isS = side === 'sales';
  const summary: ReceiptLine[] = [
    kv(isS ? 'Sales' : 'Purchases', fmt(d.gross)),
    kv('Returns', fmt(d.returns)),
    kv(isS ? 'Net sales' : 'Net purchases', fmt(d.net), { big: true }),
    kv(isS ? 'Received' : 'Paid', fmt(d.settled)),
    kv(isS ? 'Still to receive' : 'Still to pay', fmt(d.due)),
    isS ? kv('Gross profit', fmtSigned(d.grossProfit)) : kv('Avg. invoice', fmt(d.avgInvoice)),
    { t: 'hr' },
  ];
  let body: ReceiptLine[];
  let columns: Receipt['columns'];
  if (group === 'invoices') {
    columns = { widths: [24, 46, 30], align: ['left', 'left', 'right'] };
    body = [
      { t: 'row', cells: ['No.', isS ? 'Customer' : 'Supplier', 'Amount'], bold: true },
      ...d.docs.map<ReceiptLine>((i) => ({ t: 'row', cells: [i.number, i.partyName, (i.kind === d.returnKind ? '−' : '') + fmt(i.total)] })),
    ];
  } else if (group === 'products') {
    columns = { widths: [56, 14, 30], align: ['left', 'right', 'right'] };
    body = [{ t: 'row', cells: ['Product', 'Qty', 'Amount'], bold: true }, ...d.products.map<ReceiptLine>((p) => ({ t: 'row', cells: [p.name, fmtQty(p.qty), fmtSigned(p.amount)] }))];
  } else {
    columns = { widths: [52, 14, 34], align: ['left', 'right', 'right'] };
    body = [{ t: 'row', cells: [isS ? 'Customer' : 'Supplier', 'Inv', 'Net'], bold: true }, ...d.parties.map<ReceiptLine>((p) => ({ t: 'row', cells: [p.name, String(p.invoices), fmtSigned(p.amount)] }))];
  }
  return report(isS ? 'Sales Report' : 'Purchase Report', business, [['Period', period(range)]], [...summary, ...body], columns, range.to);
}

const STOCK_COLS: Receipt['columns'] = { widths: [44, 14, 14, 14, 14], align: ['left', 'right', 'right', 'right', 'right'] };

export function stockSummaryReceipt(d: ReturnType<typeof stockSummary>, range: Range, business: string): Receipt {
  return report(
    'Stock Summary',
    business,
    [['Period', period(range)]],
    [
      { t: 'row', cells: ['Product', 'Open', 'In', 'Out', 'Close'], bold: true },
      ...d.rows.map<ReceiptLine>((r) => ({ t: 'row', cells: [r.name, fmtQty(r.open), signedQty(r.qtyIn, '+'), signedQty(r.qtyOut, '−'), fmtQty(r.close)] })),
      { t: 'hr' },
      { t: 'row', cells: ['Total pcs', fmtQty(d.totals.open), signedQty(d.totals.qtyIn, '+'), signedQty(d.totals.qtyOut, '−'), fmtQty(d.totals.close)], bold: true },
      kv('Stock value at cost', fmt(d.totals.value), { bold: true }),
      kv('Running low', String(d.lowCount)),
    ],
    STOCK_COLS,
    range.to,
  );
}

export function stockLedgerReceipt(d: NonNullable<ReturnType<typeof stockLedger>>, product: ProductRowData, range: Range, business: string): Receipt {
  const rows = [...d.rows].reverse();
  return report(
    'Stock Ledger',
    business,
    [
      ['Product', product.name],
      ['SKU', product.sku],
      ['Period', period(range)],
    ],
    [
      kv('Opening', `${fmtQty(d.open)} pcs`),
      kv('In', `+${fmtQty(d.qtyIn)}`),
      kv('Out', `−${fmtQty(d.qtyOut)}`),
      kv('Closing', `${fmtQty(d.close)} pcs`, { big: true }),
      { t: 'hr' },
      { t: 'row', cells: ['Date', 'Ref', 'In', 'Out', 'Bal'], bold: true },
      { t: 'row', cells: ['', 'Opening b/f', '', '', fmtQty(d.open)] },
      ...rows.map<ReceiptLine>((r) => ({ t: 'row', cells: [dateLabel(r.date), r.ref, r.qty > 0 ? `+${r.qty}` : '', r.qty < 0 ? `−${-r.qty}` : '', fmtQty(r.balance)] })),
    ],
    { widths: [17, 39, 14, 14, 16], align: ['left', 'left', 'right', 'right', 'right'] },
    range.to,
  );
}

export function stockLedgerAllReceipt(d: ReturnType<typeof stockLedgerAll>, range: Range, business: string): Receipt {
  return report(
    'Stock Ledger · All products',
    business,
    [['Period', period(range)]],
    [
      { t: 'row', cells: ['Product', 'Open', 'In', 'Out', 'Close'], bold: true },
      ...d.cards.map<ReceiptLine>((c) => ({ t: 'row', cells: [c.product.name, fmtQty(c.open), signedQty(c.qtyIn, '+'), signedQty(c.qtyOut, '−'), fmtQty(c.close)] })),
      { t: 'hr' },
      { t: 'row', cells: ['Total pcs', fmtQty(d.open), signedQty(d.qtyIn, '+'), signedQty(d.qtyOut, '−'), fmtQty(d.close)], bold: true },
      kv('Worth at cost', fmt(d.value), { bold: true }),
    ],
    STOCK_COLS,
    range.to,
  );
}
