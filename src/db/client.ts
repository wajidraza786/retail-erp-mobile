import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DB_NAME = 'books.db';

/** Raw expo-sqlite handle (used for PRAGMAs, backup and Drizzle Studio). */
export const sqlite = openDatabaseSync(DB_NAME, { enableChangeListener: true });

sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
/** A Drizzle transaction handle. Services accept this so they compose inside one transaction. */
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];
/** Anything that can run queries: the db itself or an open transaction. */
export type Executor = DB | Tx;
