import * as Crypto from 'expo-crypto';
import { and, eq, isNull } from 'drizzle-orm';

import type { Executor } from '../client';
import { accounts, type Account } from '../schema';
import { SYSTEM_KEYS, type SystemAccounts, type SystemKey } from './ledger';

export type PartyType = 'customer' | 'supplier';

/** Reads the seeded system accounts (cash, ar, sales …) as key → id. */
export function getSystemAccounts(ex: Executor): SystemAccounts {
  const rows = ex
    .select({ id: accounts.id, key: accounts.systemKey })
    .from(accounts)
    .all()
    .filter((r): r is { id: string; key: SystemKey } => !!r.key);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.id])) as Partial<SystemAccounts>;
  const missing = SYSTEM_KEYS.filter((k) => !map[k]);
  if (missing.length) throw new Error(`Chart of accounts is missing: ${missing.join(', ')}`);
  return map as SystemAccounts;
}

export function getPartyAccount(ex: Executor, type: PartyType, partyId: string): Account {
  const col = type === 'customer' ? accounts.customerId : accounts.supplierId;
  const acc = ex.select().from(accounts).where(eq(col, partyId)).get();
  if (!acc) throw new Error(`No ledger account for ${type} ${partyId}`);
  return acc;
}

export function getAccount(ex: Executor, id: string): Account | undefined {
  return ex.select().from(accounts).where(eq(accounts.id, id)).get();
}

/**
 * Creates the sub-account for a customer (under 1103 Accounts Receivable) or a
 * supplier (under 2101 Accounts Payable), coded `1103-01`, `1103-02` …
 */
export function createPartyAccount(ex: Executor, type: PartyType, partyId: string, name: string): string {
  const sys = getSystemAccounts(ex);
  const parentId = type === 'customer' ? sys.ar : sys.ap;
  const parent = getAccount(ex, parentId)!;
  const siblings = ex
    .select({ code: accounts.code })
    .from(accounts)
    .where(and(eq(accounts.parentId, parentId), isNull(accounts.deletedAt)))
    .all();
  const next = siblings.reduce((m, s) => Math.max(m, parseInt(s.code.split('-')[1] ?? '0', 10) || 0), 0) + 1;
  const id = Crypto.randomUUID();
  ex.insert(accounts)
    .values({
      id,
      code: `${parent.code}-${String(next).padStart(2, '0')}`,
      name,
      type: parent.type,
      parentId,
      isGroup: false,
      partyType: type,
      customerId: type === 'customer' ? partyId : null,
      supplierId: type === 'supplier' ? partyId : null,
    })
    .run();
  return id;
}
