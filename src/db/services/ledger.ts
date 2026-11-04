/**
 * Posting engine (PRD §6). Pure functions: they turn a document into balanced journal
 * lines and never touch the database, so every rule is unit-testable.
 *
 * T = total, P = paid now, C = Σ qty × cost_at_time.
 *
 * | Doc | Debit                     | Credit                   |
 * |-----|---------------------------|--------------------------|
 * | SI  | AR T · Cash P · COGS C    | Sales T · AR P · Stock C |
 * | SR  | SalesRet T · AR P · Stock C | AR T · Cash P · COGS C |
 * | PI  | Stock T · AP P            | AP T · Cash P            |
 * | PR  | AP T · Cash P             | Stock T · AP P           |
 * | CRV | Cash                      | Selected account         |
 * | CPV | Selected account          | Cash                     |
 * | JV  | as entered                | as entered               |
 */
import type { Paisa } from '@/lib/money';

import type { InvoiceKind, VoucherKind } from '../schema';
import { UnbalancedError } from './errors';

export const SYSTEM_KEYS = [
  'cash',
  'bank',
  'ar',
  'inv',
  'furn',
  'ap',
  'capital',
  'draw',
  'sales',
  'salesret',
  'otherinc',
  'cogs',
  'rent',
  'salary',
  'elec',
  'transport',
  'misc',
] as const;
export type SystemKey = (typeof SYSTEM_KEYS)[number];

/** System key → account id. */
export type SystemAccounts = Record<SystemKey, string>;

export type PostingLine = {
  accountId: string;
  debit: Paisa;
  credit: Paisa;
  memo: string;
  /** "Who" column of the Cash Book. */
  counterparty: string | null;
};

const line = (accountId: string, debit: Paisa, credit: Paisa, memo: string, counterparty: string | null): PostingLine => ({
  accountId,
  debit,
  credit,
  memo,
  counterparty,
});

/** Drops zero-amount lines (PRD §6: zero-amount lines are not written). */
const nonZero = (lines: PostingLine[]) => lines.filter((l) => l.debit !== 0 || l.credit !== 0);

export function sumSides(lines: { debit: number; credit: number }[]) {
  return lines.reduce((s, l) => ({ debit: s.debit + l.debit, credit: s.credit + l.credit }), { debit: 0, credit: 0 });
}

/** Throws `UnbalancedError` if Σ debit ≠ Σ credit. */
export function assertBalanced(lines: { debit: number; credit: number }[]) {
  const { debit, credit } = sumSides(lines);
  if (debit !== credit) throw new UnbalancedError(debit, credit);
}

// ─── invoices ──────────────────────────────────────────────────────────────────

export type InvoiceTotalsInput = { lines: { qty: number; rate: Paisa; costAtTime: Paisa }[]; discount: Paisa; paid: Paisa };

/** subtotal = Σ qty×rate, total = max(0, subtotal − discount), paid = min(paid, total). */
export function invoiceTotals({ lines, discount, paid }: InvoiceTotalsInput) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount));
  const cost = lines.reduce((s, l) => s + l.qty * l.costAtTime, 0);
  const paidNow = Math.min(Math.max(0, paid), total);
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  return { subtotal, total, cost, paid: paidNow, due: total - paidNow, qty };
}

export type InvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'refunded' | 'credited';

export function invoiceStatus(kind: InvoiceKind, total: Paisa, paid: Paisa): InvoiceStatus {
  const due = total - paid;
  if (kind === 'SR' || kind === 'PR') return due <= 0 ? 'refunded' : 'credited';
  if (due <= 0) return 'paid';
  return paid > 0 ? 'partial' : 'unpaid';
}

/** Stock direction per document kind. */
export const STOCK_SIGN: Record<InvoiceKind, 1 | -1> = { SI: -1, SR: 1, PI: 1, PR: -1 };

export type InvoicePostingInput = {
  kind: InvoiceKind;
  total: Paisa;
  paid: Paisa;
  cost: Paisa;
  /** Customer AR sub-account (SI/SR) or supplier AP sub-account (PI/PR). */
  partyAccountId: string;
  partyName: string;
};

export function buildInvoicePostings(inv: InvoicePostingInput, sys: SystemAccounts): PostingLine[] {
  const { total: T, paid: P, cost: C, partyAccountId: party, partyName: who } = inv;
  let lines: PostingLine[];
  switch (inv.kind) {
    case 'SI':
      lines = [
        line(party, T, 0, 'Sale invoice', who),
        line(sys.sales, 0, T, 'Sale invoice', who),
        line(sys.cash, P, 0, 'Received at sale', who),
        line(party, 0, P, 'Received at sale', who),
        line(sys.cogs, C, 0, 'Cost of goods sold', who),
        line(sys.inv, 0, C, 'Stock sold', who),
      ];
      break;
    case 'SR':
      lines = [
        line(sys.salesret, T, 0, 'Sale return', who),
        line(party, 0, T, 'Sale return', who),
        line(party, P, 0, 'Refund paid', who),
        line(sys.cash, 0, P, 'Refund paid', who),
        line(sys.inv, C, 0, 'Stock returned', who),
        line(sys.cogs, 0, C, 'Stock returned', who),
      ];
      break;
    case 'PI':
      lines = [
        line(sys.inv, T, 0, 'Purchase invoice', who),
        line(party, 0, T, 'Purchase invoice', who),
        line(party, P, 0, 'Paid at purchase', who),
        line(sys.cash, 0, P, 'Paid at purchase', who),
      ];
      break;
    case 'PR':
      lines = [
        line(party, T, 0, 'Purchase return', who),
        line(sys.inv, 0, T, 'Stock returned to supplier', who),
        line(sys.cash, P, 0, 'Refund received', who),
        line(party, 0, P, 'Refund received', who),
      ];
      break;
  }
  const out = nonZero(lines);
  assertBalanced(out);
  return out;
}

// ─── vouchers ──────────────────────────────────────────────────────────────────

export type VoucherPostingInput =
  | { kind: 'CRV' | 'CPV'; accountId: string; accountName: string; amount: Paisa; narration: string }
  | { kind: 'JV'; lines: { accountId: string; debit: Paisa; credit: Paisa }[]; narration: string };

export function buildVoucherPostings(v: VoucherPostingInput, sys: SystemAccounts): PostingLine[] {
  let lines: PostingLine[];
  if (v.kind === 'JV') {
    lines = v.lines.map((l) => line(l.accountId, l.debit, l.credit, v.narration, 'Journal'));
  } else if (v.kind === 'CRV') {
    lines = [
      line(sys.cash, v.amount, 0, v.narration, v.accountName),
      line(v.accountId, 0, v.amount, v.narration, 'Cash receipt'),
    ];
  } else {
    lines = [
      line(v.accountId, v.amount, 0, v.narration, 'Cash payment'),
      line(sys.cash, 0, v.amount, v.narration, v.accountName),
    ];
  }
  const out = nonZero(lines);
  assertBalanced(out);
  return out;
}

/** The two stored lines of a CRV / CPV (cash + counter account). */
export function cashVoucherLines(kind: Extract<VoucherKind, 'CRV' | 'CPV'>, cashId: string, accountId: string, amount: Paisa) {
  return kind === 'CRV'
    ? [
        { accountId: cashId, debit: amount, credit: 0 },
        { accountId, debit: 0, credit: amount },
      ]
    : [
        { accountId, debit: amount, credit: 0 },
        { accountId: cashId, debit: 0, credit: amount },
      ];
}

// ─── opening balances ──────────────────────────────────────────────────────────
// Every opening amount is balanced against Owner's Capital, so capital ends up as the
// balancing figure of the opening position (PRD §6, "Opening").

const OB = 'Opening balance';

export function buildBusinessOpening(v: { cash: Paisa; bank: Paisa; furniture: Paisa }, sys: SystemAccounts): PostingLine[] {
  const total = v.cash + v.bank + v.furniture;
  const out = nonZero([
    line(sys.cash, v.cash, 0, OB, OB),
    line(sys.bank, v.bank, 0, OB, OB),
    line(sys.furn, v.furniture, 0, OB, OB),
    line(sys.capital, 0, total, OB, OB),
  ]);
  assertBalanced(out);
  return out;
}

/** Customer opening: they owe you → Dr AR / Cr Capital. */
export function buildCustomerOpening(accountId: string, amount: Paisa, sys: SystemAccounts): PostingLine[] {
  return nonZero([line(accountId, amount, 0, OB, OB), line(sys.capital, 0, amount, OB, OB)]);
}

/** Supplier opening: you owe them → Dr Capital / Cr AP. */
export function buildSupplierOpening(accountId: string, amount: Paisa, sys: SystemAccounts): PostingLine[] {
  return nonZero([line(sys.capital, amount, 0, OB, OB), line(accountId, 0, amount, OB, OB)]);
}

/** Opening stock: Dr Stock in Hand / Cr Capital at qty × cost. */
export function buildStockOpening(qty: number, cost: Paisa, sys: SystemAccounts): PostingLine[] {
  const value = qty * cost;
  return nonZero([line(sys.inv, value, 0, 'Opening stock', OB), line(sys.capital, 0, value, 'Opening stock', OB)]);
}

// ─── balances ──────────────────────────────────────────────────────────────────

/** Natural balance shown to users: A and X → raw; L, E and I → −raw (raw = Σdr − Σcr). */
export function naturalBalance(type: string, raw: number): number {
  return type === 'A' || type === 'X' ? raw : -raw;
}
