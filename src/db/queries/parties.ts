import { eq, isNull, sql } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { accounts, customers, postings, suppliers } from '../schema';
import type { PartyType } from '../services/accounts';

export type PartyRowData = {
  id: string;
  name: string;
  phone: string | null;
  accountId: string;
  accountCode: string;
  /** Natural balance: for customers, what they owe you; for suppliers, what you owe. */
  balance: number;
  isWalkIn: boolean;
};

/** Customers or suppliers with their natural balance (aggregate join on postings). */
export function listParties(type: PartyType, search = '', ex: Executor = db): PartyRowData[] {
  const party = type === 'customer' ? customers : suppliers;
  const link = type === 'customer' ? accounts.customerId : accounts.supplierId;
  const rows = ex
    .select({
      id: party.id,
      name: party.name,
      phone: party.phone,
      accountId: accounts.id,
      accountCode: accounts.code,
      raw: sql<number>`coalesce((select sum(${postings.debit}) - sum(${postings.credit}) from ${postings} where ${postings.accountId} = ${accounts.id} and ${postings.deletedAt} is null), 0)`,
      isWalkIn: type === 'customer' ? customers.isWalkIn : sql<boolean>`0`,
    })
    .from(party)
    .innerJoin(accounts, eq(link, party.id))
    .where(isNull(party.deletedAt))
    .orderBy(accounts.code)
    .all();
  const q = search.trim().toLowerCase();
  return rows
    .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.phone ?? '').includes(q))
    .map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      accountId: r.accountId,
      accountCode: r.accountCode,
      balance: type === 'customer' ? Number(r.raw) : -Number(r.raw),
      isWalkIn: !!r.isWalkIn,
    }));
}

export function getWalkInCustomerId(ex: Executor = db): string | null {
  return ex.select({ id: customers.id }).from(customers).where(eq(customers.isWalkIn, true)).get()?.id ?? null;
}
