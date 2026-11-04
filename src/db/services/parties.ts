import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

import { nowTimestamp, today, type ISODate } from '@/lib/dates';
import type { Paisa } from '@/lib/money';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { accounts, customers, suppliers } from '../schema';
import { createPartyAccount, getSystemAccounts, type PartyType } from './accounts';
import { ValidationError } from './errors';
import { buildCustomerOpening, buildSupplierOpening } from './ledger';
import { writePostings } from './postings';

export type PartyInput = { name: string; phone?: string; opening?: Paisa; date?: ISODate; isWalkIn?: boolean };

/** Creates the party, its AR/AP sub-account and its opening posting in one transaction. */
export function createPartyTx(tx: Executor, type: PartyType, input: PartyInput): string {
  const name = input.name.trim();
  const opening = input.opening ?? 0;
  if (!name) throw new ValidationError([{ field: 'name', message: 'Enter a name.' }]);
  if (opening < 0) throw new ValidationError([{ field: 'opening', message: 'Opening balance cannot be negative.' }]);

  const id = Crypto.randomUUID();
  const phone = input.phone?.trim() || null;
  if (type === 'customer') {
    tx.insert(customers).values({ id, name, phone, openingBalance: opening, isWalkIn: !!input.isWalkIn }).run();
  } else {
    tx.insert(suppliers).values({ id, name, phone, openingBalance: opening }).run();
  }
  const accountId = createPartyAccount(tx, type, id, name);
  if (opening > 0) {
    const sys = getSystemAccounts(tx);
    const lines = type === 'customer' ? buildCustomerOpening(accountId, opening, sys) : buildSupplierOpening(accountId, opening, sys);
    writePostings(tx, lines, { date: input.date ?? today(), sourceType: 'opening', sourceId: id, ref: 'Opening' });
  }
  return id;
}

export function createParty(type: PartyType, input: PartyInput): string {
  const id = db.transaction((tx) => createPartyTx(tx, type, input));
  notifyDataChanged();
  return id;
}

export function updateParty(type: PartyType, id: string, patch: { name?: string; phone?: string }) {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw new ValidationError([{ field: 'name', message: 'Enter a name.' }]);
  db.transaction((tx) => {
    const table = type === 'customer' ? customers : suppliers;
    tx.update(table)
      .set({ ...(name ? { name } : {}), ...(patch.phone !== undefined ? { phone: patch.phone.trim() || null } : {}), updatedAt: nowTimestamp() })
      .where(eq(table.id, id))
      .run();
    if (name) {
      const col = type === 'customer' ? accounts.customerId : accounts.supplierId;
      tx.update(accounts).set({ name, updatedAt: nowTimestamp() }).where(eq(col, id)).run();
    }
  });
  notifyDataChanged();
}
