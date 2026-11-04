import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { backupDatabaseAsync, openDatabaseAsync } from 'expo-sqlite';

import { sqlite } from '@/db/client';
import { notifyDataChanged } from '@/db/events';
import { updateSettings } from '@/db/services/settings';

import { nowTimestamp, today } from './dates';

const asUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

/** Copies the live database to a dated file and opens the share sheet. */
export async function exportBackup() {
  // Flush WAL pages into the main file so the copy is complete.
  sqlite.execSync('PRAGMA wal_checkpoint(TRUNCATE);');
  const target = new File(Paths.cache, `books-${today()}.db`);
  if (target.exists) target.delete();
  new File(asUri(sqlite.databasePath)).copy(target);
  await Sharing.shareAsync(target.uri, { mimeType: 'application/x-sqlite3', dialogTitle: 'Save backup' });
  updateSettings({ lastBackupAt: nowTimestamp() });
}

/**
 * Lets the user pick a backup file and copies it over the live database using SQLite's
 * online backup API, so no app restart is needed. Returns false if cancelled.
 */
export async function restoreBackup(): Promise<boolean> {
  const picked = await File.pickFileAsync();
  if (picked.canceled) return false;

  const tmpName = 'restore-tmp.db';
  const tmp = new File(new File(asUri(sqlite.databasePath)).parentDirectory, tmpName);
  if (tmp.exists) tmp.delete();
  picked.result.copy(tmp);

  const source = await openDatabaseAsync(tmpName);
  try {
    const ok = await source.getFirstAsync<{ n: number }>("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('settings', 'postings', 'accounts')");
    if (!ok || ok.n < 3) throw new Error('That file is not a backup from this app.');
    await backupDatabaseAsync({ sourceDatabase: source, destDatabase: sqlite });
  } finally {
    await source.closeAsync();
    if (tmp.exists) tmp.delete();
  }
  notifyDataChanged();
  return true;
}
