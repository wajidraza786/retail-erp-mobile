import * as Crypto from 'expo-crypto';
import { eq, sql } from 'drizzle-orm';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { brands, categories } from '../schema';
import { ValidationError } from './errors';

type GroupTable = typeof categories | typeof brands;

function createGroupTx(tx: Executor, table: GroupTable, label: string, rawName: string): string {
  const name = rawName.trim();
  if (!name) throw new ValidationError([{ field: 'name', message: 'Enter a name.' }]);
  const dup = tx
    .select({ id: table.id })
    .from(table)
    .where(eq(sql`lower(${table.name})`, name.toLowerCase()))
    .get();
  if (dup) throw new ValidationError([{ field: 'name', message: `${name} is already a ${label}.` }]);
  const id = Crypto.randomUUID();
  tx.insert(table).values({ id, name }).run();
  return id;
}

export const createCategoryTx = (tx: Executor, name: string) => createGroupTx(tx, categories, 'category', name);
export const createBrandTx = (tx: Executor, name: string) => createGroupTx(tx, brands, 'brand', name);

export function createCategory(name: string): string {
  const id = db.transaction((tx) => createCategoryTx(tx, name));
  notifyDataChanged();
  return id;
}

export function createBrand(name: string): string {
  const id = db.transaction((tx) => createBrandTx(tx, name));
  notifyDataChanged();
  return id;
}
