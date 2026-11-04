/**
 * Sample shop from the prototype (Raza Mobile Hub). The prototype is dated
 * 1–14 Oct 2026; dates are shifted so its "today" lands on the real today.
 */
import { eq } from 'drizzle-orm';

import { addDays, daysBetween, today } from '@/lib/dates';
import { toPaisa } from '@/lib/money';

import { db, type Executor } from './client';
import { notifyDataChanged } from './events';
import { customers, settings, type InvoiceKind, type VoucherKind } from './schema';
import { getPartyAccount, getSystemAccounts } from './services/accounts';
import { createBrandTx, createCategoryTx } from './services/catalog';
import { saveInvoiceTx } from './services/invoices';
import type { SystemKey } from './services/ledger';
import { createPartyTx } from './services/parties';
import { saveProductTx } from './services/products';
import { postOpeningTx } from './services/settings';
import { saveVoucherTx } from './services/vouchers';

const PROTO_TODAY = '2026-10-14';
const PROTO_OPENING = '2026-10-01';

const categories = ['Chargers', 'Cables', 'Audio', 'Power Banks', 'Smart Watches'];
const brands = ['Anker', 'Samsung', 'Baseus', 'Xiaomi', 'Audionic', 'Ronin'];

// [key, name, sku, category, brand, cost, price, opening, reorder]
const products: [string, string, string, number, number, number, number, number, number][] = [
  ['p1', 'Anker 20W USB-C Charger', 'ANK-20W', 0, 0, 2400, 3200, 40, 10],
  ['p2', 'Samsung 25W Super Fast Charger', 'SAM-25W', 0, 1, 3100, 4200, 25, 8],
  ['p3', 'Baseus 65W GaN Charger', 'BAS-65G', 0, 2, 5200, 6900, 12, 4],
  ['p4', 'Anker USB-C to Lightning 1m', 'ANK-CL1', 1, 0, 1500, 2200, 60, 15],
  ['p5', 'Baseus Type-C Cable 2m', 'BAS-TC2', 1, 2, 650, 1000, 80, 20],
  ['p6', 'Xiaomi Redmi Buds 5', 'XMI-RB5', 2, 3, 6200, 7999, 18, 5],
  ['p7', 'Audionic Airbud 550', 'AUD-550', 2, 4, 2800, 3799, 30, 8],
  ['p8', 'Ronin R-7 Earphones', 'RON-R7', 2, 5, 900, 1450, 6, 5],
  ['p9', 'Xiaomi 20000mAh Power Bank', 'XMI-PB20', 3, 3, 5400, 6999, 14, 4],
  ['p10', 'Baseus 10000mAh Magnetic', 'BAS-MG10', 3, 2, 4300, 5800, 4, 3],
  ['p11', 'Xiaomi Smart Band 9', 'XMI-SB9', 4, 3, 8200, 10499, 10, 3],
  ['p12', 'Ronin R-06 Smart Watch', 'RON-W06', 4, 5, 4900, 6499, 3, 3],
];

const customerList: [string, string, string, number][] = [
  ['c1', 'Bilal Electronics', '0300 4412870', 45000],
  ['c2', 'Ahmed Mobile Zone', '0321 7781203', 18500],
  ['c3', 'Faisal Communication', '0333 2109876', 0],
  ['c4', 'Zainab Traders', '0345 5566120', 32000],
  ['c5', 'Hamza Raza', '0312 9087711', 0],
];

const supplierList: [string, string, string, number][] = [
  ['s1', 'Al-Fatah Distributors', '021 3241 8800', 120000],
  ['s2', 'TechHub Imports', '042 3575 1290', 65000],
  ['s3', 'Star Link Wholesale', '0300 8123456', 0],
  ['s4', 'Audionic Pvt Ltd', '021 3456 7000', 28000],
];

type L = [string, number, number];
const invoiceList: [InvoiceKind, string, string, L[], number, number][] = [
  ['PI', '2026-10-02', 's1', [['p1', 20, 2400], ['p4', 20, 1500]], 0, 50000],
  ['SI', '2026-10-03', 'c1', [['p1', 10, 3200], ['p5', 20, 1000]], 2000, 20000],
  ['SI', '2026-10-05', 'c0', [['p6', 1, 7999], ['p4', 2, 2200]], 0, 12399],
  ['PI', '2026-10-06', 's2', [['p6', 10, 6200]], 0, 0],
  ['SI', '2026-10-08', 'c2', [['p9', 3, 6999], ['p7', 4, 3799]], 193, 10000],
  ['SI', '2026-10-09', 'c3', [['p4', 5, 2200]], 0, 11000],
  ['PI', '2026-10-09', 's4', [['p7', 20, 2800]], 0, 20000],
  ['SI', '2026-10-10', 'c4', [['p2', 6, 4200], ['p3', 2, 6900]], 0, 0],
  ['PR', '2026-10-10', 's2', [['p6', 1, 6200]], 0, 0],
  ['SI', '2026-10-11', 'c0', [['p4', 1, 2200], ['p5', 3, 1000]], 0, 5200],
  ['SR', '2026-10-11', 'c2', [['p7', 1, 3799]], 0, 0],
  ['SI', '2026-10-12', 'c0', [['p11', 1, 10499]], 0, 10499],
  ['SI', '2026-10-13', 'c5', [['p7', 2, 3799], ['p8', 3, 1450]], 0, 11948],
  ['PI', '2026-10-13', 's3', [['p5', 50, 650]], 0, 32500],
  ['SI', '2026-10-14', 'c1', [['p10', 2, 5800], ['p5', 10, 1000]], 0, 5000],
  ['SI', '2026-10-14', 'c0', [['p1', 1, 3200]], 0, 3200],
];

type V =
  | { kind: Exclude<VoucherKind, 'JV'>; date: string; acct: string; amount: number; narration: string }
  | { kind: 'JV'; date: string; lines: [string, number, number][]; narration: string };
const voucherList: V[] = [
  { kind: 'CPV', date: '2026-10-01', acct: 'rent', amount: 60000, narration: 'October shop rent' },
  { kind: 'JV', date: '2026-10-05', lines: [['bank', 50000, 0], ['cash', 0, 50000]], narration: 'Cash deposited to Meezan Bank' },
  { kind: 'CRV', date: '2026-10-07', acct: 'ar:c1', amount: 25000, narration: 'Part payment against old balance' },
  { kind: 'CPV', date: '2026-10-09', acct: 'ap:s1', amount: 40000, narration: 'Payment to Al-Fatah' },
  { kind: 'JV', date: '2026-10-10', lines: [['salary', 45000, 0], ['bank', 0, 45000]], narration: 'Staff salaries for September' },
  { kind: 'CPV', date: '2026-10-11', acct: 'elec', amount: 14250, narration: 'LESCO electricity bill' },
  { kind: 'CRV', date: '2026-10-12', acct: 'ar:c4', amount: 15000, narration: 'Received from Zainab Traders' },
  { kind: 'CPV', date: '2026-10-13', acct: 'transport', amount: 3500, narration: 'Courier and loading charges' },
];

/** Loads the sample shop. Only valid on a fresh (seeded, not yet set up) database. */
export function seedDemo() {
  const shift = daysBetween(PROTO_TODAY, today());
  const D = (d: string) => addDays(d, shift);
  const opening = D(PROTO_OPENING);

  db.transaction((tx: Executor) => {
    tx.update(settings)
      .set({ nextSI: 1040, nextSR: 12, nextPI: 231, nextPR: 7, nextCRV: 88, nextCPV: 154, nextJV: 21 })
      .where(eq(settings.id, 'main'))
      .run();
    postOpeningTx(tx, { businessName: 'Raza Mobile Hub', cash: toPaisa(250000), bank: toPaisa(400000), furniture: toPaisa(120000), date: opening });

    const catIds = categories.map((n) => createCategoryTx(tx, n));
    const brandIds = brands.map((n) => createBrandTx(tx, n));
    const pid: Record<string, string> = {};
    products.forEach(([key, name, sku, cat, brand, cost, price, open, reorder]) => {
      pid[key] = saveProductTx(tx, {
        name, sku, categoryId: catIds[cat], brandId: brandIds[brand],
        costPrice: toPaisa(cost), salePrice: toPaisa(price), openingStock: open, reorderLevel: reorder, date: opening,
      });
    });

    const walkIn = tx.select({ id: customers.id }).from(customers).where(eq(customers.isWalkIn, true)).get()!;
    const party: Record<string, string> = { c0: walkIn.id };
    customerList.forEach(([key, name, phone, open]) => {
      party[key] = createPartyTx(tx, 'customer', { name, phone, opening: toPaisa(open), date: opening });
    });
    supplierList.forEach(([key, name, phone, open]) => {
      party[key] = createPartyTx(tx, 'supplier', { name, phone, opening: toPaisa(open), date: opening });
    });

    invoiceList.forEach(([kind, date, p, lines, discount, paid]) => {
      saveInvoiceTx(tx, {
        kind, date: D(date), partyId: party[p],
        lines: lines.map(([k, qty, rate]) => ({ productId: pid[k], qty, rate: toPaisa(rate) })),
        discount: toPaisa(discount), paid: toPaisa(paid),
      });
    });

    const sys = getSystemAccounts(tx);
    const acct = (k: string) => {
      if (k.startsWith('ar:')) return getPartyAccount(tx, 'customer', party[k.slice(3)]).id;
      if (k.startsWith('ap:')) return getPartyAccount(tx, 'supplier', party[k.slice(3)]).id;
      return sys[k as SystemKey];
    };
    voucherList.forEach((v) => {
      if (v.kind === 'JV') {
        saveVoucherTx(tx, { kind: 'JV', date: D(v.date), narration: v.narration, lines: v.lines.map(([k, dr, cr]) => ({ accountId: acct(k), debit: toPaisa(dr), credit: toPaisa(cr) })) });
      } else {
        saveVoucherTx(tx, { kind: v.kind, date: D(v.date), narration: v.narration, accountId: acct(v.acct), amount: toPaisa(v.amount) });
      }
    });
  });
  notifyDataChanged();
}
