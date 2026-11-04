import { eq } from 'drizzle-orm';

import { today, nowTimestamp, type ISODate } from '@/lib/dates';
import type { Paisa } from '@/lib/money';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { settings, type Settings } from '../schema';
import { getSystemAccounts } from './accounts';
import { ValidationError } from './errors';
import { buildBusinessOpening } from './ledger';
import { writePostings } from './postings';

export function getSettings(ex: Executor = db): Settings {
  const row = ex.select().from(settings).where(eq(settings.id, 'main')).get();
  if (!row) throw new Error('Settings row missing. Did the seed run?');
  return row;
}

export type SettingsPatch = Partial<
  Pick<Settings, 'businessName' | 'allowNegativeStock' | 'lastBackupAt' | 'paperWidth' | 'printerName' | 'printerAddress' | 'printerCut' | 'receiptFooter'>
>;

export function updateSettings(patch: SettingsPatch) {
  if (patch.businessName !== undefined && !patch.businessName.trim()) {
    throw new ValidationError([{ field: 'businessName', message: 'Enter the business name.' }]);
  }
  if (patch.paperWidth !== undefined && patch.paperWidth !== 58 && patch.paperWidth !== 80) {
    throw new ValidationError([{ field: 'paperWidth', message: 'Paper width must be 58 mm or 80 mm.' }]);
  }
  db.update(settings)
    .set({ ...patch, updatedAt: nowTimestamp() })
    .where(eq(settings.id, 'main'))
    .run();
  notifyDataChanged();
}

export type OpeningValues = { businessName: string; cash: Paisa; bank: Paisa; furniture: Paisa; date?: ISODate };

/** Business setup: records opening cash, bank and furniture against Owner's Capital. */
export function postOpeningTx(tx: Executor, v: OpeningValues) {
  const s = getSettings(tx);
  if (s.setupCompletedAt) throw new ValidationError([{ field: 'setup', message: 'The business is already set up.' }]);
  if (!v.businessName.trim()) throw new ValidationError([{ field: 'businessName', message: 'Enter the business name.' }]);
  if (v.cash < 0 || v.bank < 0 || v.furniture < 0) {
    throw new ValidationError([{ field: 'opening', message: 'Opening amounts cannot be negative.' }]);
  }
  const date = v.date ?? today();
  writePostings(tx, buildBusinessOpening(v, getSystemAccounts(tx)), {
    date,
    sourceType: 'opening',
    sourceId: 'main',
    ref: 'Opening',
  });
  tx.update(settings)
    .set({
      businessName: v.businessName.trim(),
      openingDate: date,
      openingCash: v.cash,
      openingBank: v.bank,
      openingFurniture: v.furniture,
      setupCompletedAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    })
    .where(eq(settings.id, 'main'))
    .run();
}

export function postOpening(v: OpeningValues) {
  db.transaction((tx) => postOpeningTx(tx, v));
  notifyDataChanged();
}
