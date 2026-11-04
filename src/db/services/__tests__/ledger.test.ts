import { toPaisa } from '@/lib/money';

import { UnbalancedError } from '../errors';
import {
  assertBalanced,
  buildBusinessOpening,
  buildCustomerOpening,
  buildInvoicePostings,
  buildStockOpening,
  buildSupplierOpening,
  buildVoucherPostings,
  invoiceStatus,
  invoiceTotals,
  naturalBalance,
  sumSides,
  SYSTEM_KEYS,
  type PostingLine,
  type SystemAccounts,
} from '../ledger';

const sys = Object.fromEntries(SYSTEM_KEYS.map((k) => [k, k])) as SystemAccounts;
const AR = 'ar:bilal';
const AP = 'ap:alfatah';

/** Net raw (Σdr − Σcr) effect per account. */
const effect = (lines: PostingLine[]) =>
  lines.reduce<Record<string, number>>((m, l) => ({ ...m, [l.accountId]: (m[l.accountId] ?? 0) + l.debit - l.credit }), {});

const balanced = (lines: PostingLine[]) => {
  const { debit, credit } = sumSides(lines);
  expect(debit).toBe(credit);
};

describe('invoiceTotals', () => {
  it('computes subtotal, total, clamps paid and discount', () => {
    const t = invoiceTotals({
      lines: [
        { qty: 2, rate: 1000, costAtTime: 600 },
        { qty: 1, rate: 500, costAtTime: 300 },
      ],
      discount: 300,
      paid: 99_999,
    });
    expect(t).toEqual({ subtotal: 2500, total: 2200, cost: 1500, paid: 2200, due: 0, qty: 3 });
  });

  it('never goes below zero', () => {
    const t = invoiceTotals({ lines: [{ qty: 1, rate: 100, costAtTime: 50 }], discount: 500, paid: 10 });
    expect(t.total).toBe(0);
    expect(t.paid).toBe(0);
  });
});

describe('buildInvoicePostings', () => {
  const T = toPaisa(21_600);
  const P = toPaisa(5_000);
  const C = toPaisa(16_000);

  it('SI: AR gross then cash clears part of it; COGS against stock (PRD §12 acceptance)', () => {
    const lines = buildInvoicePostings({ kind: 'SI', total: T, paid: P, cost: C, partyAccountId: AR, partyName: 'Bilal' }, sys);
    balanced(lines);
    const e = effect(lines);
    expect(e[AR]).toBe(T - P);
    expect(e.cash).toBe(P);
    expect(e.sales).toBe(-T);
    expect(e.cogs).toBe(C);
    expect(e.inv).toBe(-C);
    // Customer ledger shows both the invoice (+21,600) and the payment (−5,000).
    const ar = lines.filter((l) => l.accountId === AR);
    expect(ar.map((l) => l.debit - l.credit)).toEqual([T, -P]);
  });

  it('SR: reverses sale into Sales Returns and puts stock back', () => {
    const lines = buildInvoicePostings({ kind: 'SR', total: T, paid: P, cost: C, partyAccountId: AR, partyName: 'Bilal' }, sys);
    balanced(lines);
    const e = effect(lines);
    expect(e.salesret).toBe(T);
    expect(e[AR]).toBe(-T + P);
    expect(e.cash).toBe(-P);
    expect(e.inv).toBe(C);
    expect(e.cogs).toBe(-C);
  });

  it('PI: stock at invoice total, AP for the unpaid part', () => {
    const lines = buildInvoicePostings({ kind: 'PI', total: T, paid: P, cost: 0, partyAccountId: AP, partyName: 'Al-Fatah' }, sys);
    balanced(lines);
    const e = effect(lines);
    expect(e.inv).toBe(T);
    expect(e[AP]).toBe(-(T - P));
    expect(e.cash).toBe(-P);
  });

  it('PR: stock leaves, AP reduced, cash refund received', () => {
    const lines = buildInvoicePostings({ kind: 'PR', total: T, paid: P, cost: 0, partyAccountId: AP, partyName: 'Al-Fatah' }, sys);
    balanced(lines);
    const e = effect(lines);
    expect(e.inv).toBe(-T);
    expect(e[AP]).toBe(T - P);
    expect(e.cash).toBe(P);
  });

  it('drops zero-amount lines (unpaid invoice has no cash line)', () => {
    const lines = buildInvoicePostings({ kind: 'SI', total: T, paid: 0, cost: C, partyAccountId: AR, partyName: 'Bilal' }, sys);
    expect(lines.some((l) => l.accountId === 'cash')).toBe(false);
    expect(lines.every((l) => l.debit > 0 || l.credit > 0)).toBe(true);
  });
});

describe('buildVoucherPostings', () => {
  it('CRV: Dr cash, Cr selected account', () => {
    const lines = buildVoucherPostings({ kind: 'CRV', accountId: AR, accountName: 'Bilal', amount: 2_500_000, narration: 'Part payment' }, sys);
    balanced(lines);
    expect(effect(lines)).toEqual({ cash: 2_500_000, [AR]: -2_500_000 });
    expect(lines[0].counterparty).toBe('Bilal');
  });

  it('CPV: Dr selected account, Cr cash', () => {
    const lines = buildVoucherPostings({ kind: 'CPV', accountId: 'rent', accountName: 'Shop Rent', amount: 6_000_000, narration: 'Rent' }, sys);
    balanced(lines);
    expect(effect(lines)).toEqual({ rent: 6_000_000, cash: -6_000_000 });
  });

  it('JV: lines as entered; unbalanced journal throws', () => {
    const ok = buildVoucherPostings(
      { kind: 'JV', narration: 'Deposit', lines: [{ accountId: 'bank', debit: 100, credit: 0 }, { accountId: 'cash', debit: 0, credit: 100 }] },
      sys,
    );
    balanced(ok);
    expect(() =>
      buildVoucherPostings(
        { kind: 'JV', narration: 'Bad', lines: [{ accountId: 'bank', debit: 100, credit: 0 }, { accountId: 'cash', debit: 0, credit: 90 }] },
        sys,
      ),
    ).toThrow(UnbalancedError);
  });
});

describe('opening balances', () => {
  it('business opening credits capital with the balancing figure', () => {
    const lines = buildBusinessOpening({ cash: 250, bank: 400, furniture: 120 }, sys);
    balanced(lines);
    expect(effect(lines).capital).toBe(-770);
  });

  it('customer, supplier and stock openings balance against capital', () => {
    [buildCustomerOpening(AR, 45, sys), buildSupplierOpening(AP, 120, sys), buildStockOpening(40, 2400, sys)].forEach(balanced);
    expect(effect(buildStockOpening(40, 2400, sys)).inv).toBe(96_000);
  });

  it('a whole day of trading still balances (trial balance invariant)', () => {
    const all = [
      ...buildBusinessOpening({ cash: 1000, bank: 0, furniture: 0 }, sys),
      ...buildStockOpening(10, 50, sys),
      ...buildInvoicePostings({ kind: 'SI', total: 300, paid: 100, cost: 150, partyAccountId: AR, partyName: 'x' }, sys),
      ...buildInvoicePostings({ kind: 'SR', total: 60, paid: 0, cost: 30, partyAccountId: AR, partyName: 'x' }, sys),
      ...buildInvoicePostings({ kind: 'PI', total: 500, paid: 500, cost: 0, partyAccountId: AP, partyName: 'y' }, sys),
      ...buildVoucherPostings({ kind: 'CRV', accountId: AR, accountName: 'x', amount: 140, narration: '' }, sys),
    ];
    expect(() => assertBalanced(all)).not.toThrow();
  });
});

describe('status and natural balance', () => {
  it('derives invoice status', () => {
    expect(invoiceStatus('SI', 100, 100)).toBe('paid');
    expect(invoiceStatus('SI', 100, 40)).toBe('partial');
    expect(invoiceStatus('PI', 100, 0)).toBe('unpaid');
    expect(invoiceStatus('SR', 100, 100)).toBe('refunded');
    expect(invoiceStatus('PR', 100, 0)).toBe('credited');
  });

  it('flips sign for L, E and I', () => {
    expect(naturalBalance('A', 50)).toBe(50);
    expect(naturalBalance('X', 50)).toBe(50);
    expect(naturalBalance('L', -50)).toBe(50);
    expect(naturalBalance('E', -50)).toBe(50);
    expect(naturalBalance('I', -50)).toBe(50);
  });
});
