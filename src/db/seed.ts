import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

import { nowTimestamp } from '@/lib/dates';

import { db, type Executor } from './client';
import { accounts, settings, type AccountType } from './schema';
import type { SystemKey } from './services/ledger';
import { createPartyTx } from './services/parties';

type CoaNode = { code: string; name: string; type?: AccountType; key?: SystemKey; group?: boolean; children?: CoaNode[] };

/** Seed Chart of Accounts (PRD §5). AR and AP are groups that hold one child per party. */
export const COA: CoaNode[] = [
  {
    code: '1', name: 'Assets', type: 'A', children: [
      {
        code: '11', name: 'Current Assets', children: [
          { code: '1101', name: 'Cash in Hand', key: 'cash' },
          { code: '1102', name: 'Meezan Bank', key: 'bank' },
          { code: '1103', name: 'Accounts Receivable', key: 'ar', group: true },
          { code: '1104', name: 'Stock in Hand', key: 'inv' },
        ],
      },
      { code: '12', name: 'Fixed Assets', children: [{ code: '1201', name: 'Furniture & Fixtures', key: 'furn' }] },
    ],
  },
  {
    code: '2', name: 'Liabilities', type: 'L', children: [
      { code: '21', name: 'Current Liabilities', children: [{ code: '2101', name: 'Accounts Payable', key: 'ap', group: true }] },
    ],
  },
  {
    code: '3', name: 'Equity', type: 'E', children: [
      { code: '3101', name: "Owner's Capital", key: 'capital' },
      { code: '3102', name: 'Drawings', key: 'draw' },
    ],
  },
  {
    code: '4', name: 'Income', type: 'I', children: [
      { code: '4101', name: 'Sales', key: 'sales' },
      { code: '4102', name: 'Sales Returns', key: 'salesret' },
      { code: '4201', name: 'Other Income', key: 'otherinc' },
    ],
  },
  {
    code: '5', name: 'Expenses', type: 'X', children: [
      { code: '5101', name: 'Cost of Goods Sold', key: 'cogs' },
      { code: '5201', name: 'Shop Rent', key: 'rent' },
      { code: '5202', name: 'Salaries', key: 'salary' },
      { code: '5203', name: 'Electricity', key: 'elec' },
      { code: '5204', name: 'Transport', key: 'transport' },
      { code: '5205', name: 'Miscellaneous', key: 'misc' },
    ],
  },
];

function insertCoa(tx: Executor, nodes: CoaNode[], parentId: string | null, inherited: AccountType | null) {
  nodes.forEach((n) => {
    const type = n.type ?? inherited!;
    const id = Crypto.randomUUID();
    tx.insert(accounts)
      .values({ id, code: n.code, name: n.name, type, parentId, isGroup: !!(n.children || n.group), systemKey: n.key ?? null })
      .run();
    if (n.children) insertCoa(tx, n.children, id, type);
  });
}

/**
 * First-launch seed: settings row, Chart of Accounts and the Walk-in Customer, in one
 * transaction. Guarded by `settings.seeded_at`, so it is safe to call on every start.
 */
export function ensureSeeded() {
  const existing = db.select({ seededAt: settings.seededAt }).from(settings).where(eq(settings.id, 'main')).get();
  if (existing?.seededAt) return;
  db.transaction((tx) => {
    if (!existing) tx.insert(settings).values({ id: 'main' }).run();
    insertCoa(tx, COA, null, null);
    createPartyTx(tx, 'customer', { name: 'Walk-in Customer', phone: 'Cash counter', isWalkIn: true });
    tx.update(settings).set({ seededAt: nowTimestamp() }).where(eq(settings.id, 'main')).run();
  });
}
