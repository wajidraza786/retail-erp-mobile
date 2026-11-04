import * as Crypto from 'expo-crypto';
import { inArray } from 'drizzle-orm';

import { today, type ISODate } from '@/lib/dates';
import type { Paisa } from '@/lib/money';

import { db, type Executor } from '../client';
import { notifyDataChanged } from '../events';
import { accounts, voucherLines, vouchers, type VoucherKind } from '../schema';
import { getSystemAccounts } from './accounts';
import { ValidationError, type FieldError } from './errors';
import { buildVoucherPostings, cashVoucherLines, sumSides } from './ledger';
import { takeNextNumber } from './numbering';
import { writePostings } from './postings';

export const VOUCHER_SHORT: Record<VoucherKind, string> = { CRV: 'Cash Receipt', CPV: 'Cash Payment', JV: 'Journal' };

export type VoucherInput = {
  kind: VoucherKind;
  date?: ISODate;
  narration?: string;
  /** CRV / CPV: the counter account and amount. */
  accountId?: string | null;
  amount?: Paisa;
  /** JV lines. */
  lines?: { accountId: string | null; debit: Paisa; credit: Paisa }[];
};

export function saveVoucherTx(tx: Executor, input: VoucherInput): { id: string; number: string } {
  const { kind } = input;
  const sys = getSystemAccounts(tx);
  const errors: FieldError[] = [];
  const narration = input.narration?.trim() || VOUCHER_SHORT[kind];

  let stored: { accountId: string; debit: Paisa; credit: Paisa }[] = [];
  let counterId: string | null = null;
  let counterName = '';

  if (kind === 'JV') {
    const lines = (input.lines ?? []).filter((l) => l.accountId || l.debit || l.credit);
    if (lines.some((l) => !l.accountId)) errors.push({ field: 'lines', message: 'Every line needs an account.' });
    if (lines.some((l) => l.debit < 0 || l.credit < 0)) errors.push({ field: 'lines', message: 'Amounts cannot be negative.' });
    if (lines.length < 2) errors.push({ field: 'lines', message: 'A journal needs at least two lines.' });
    const { debit, credit } = sumSides(lines);
    if (!debit || debit !== credit) errors.push({ field: 'lines', message: 'Debit and credit must be equal.' });
    stored = lines.filter((l): l is { accountId: string; debit: Paisa; credit: Paisa } => !!l.accountId);
  } else {
    if (!input.accountId) errors.push({ field: 'accountId', message: `Choose who the money was ${kind === 'CRV' ? 'received from.' : 'paid to.'}` });
    else if (input.accountId === sys.cash) errors.push({ field: 'accountId', message: 'Choose an account other than Cash in Hand.' });
    if (!((input.amount ?? 0) > 0)) errors.push({ field: 'amount', message: 'Enter an amount.' });
    if (input.accountId) {
      counterId = input.accountId;
      stored = cashVoucherLines(kind, sys.cash, input.accountId, input.amount ?? 0);
    }
  }

  const ids = [...new Set(stored.map((l) => l.accountId))];
  const accRows = ids.length ? tx.select({ id: accounts.id, name: accounts.name, isGroup: accounts.isGroup }).from(accounts).where(inArray(accounts.id, ids)).all() : [];
  if (accRows.length !== ids.length) errors.push({ field: 'accountId', message: 'An account on this voucher no longer exists.' });
  if (accRows.some((a) => a.isGroup)) errors.push({ field: 'accountId', message: 'Pick an account, not a group.' });
  if (errors.length) throw new ValidationError(errors);
  if (counterId) counterName = accRows.find((a) => a.id === counterId)?.name ?? '';

  const id = Crypto.randomUUID();
  const number = takeNextNumber(tx, kind);
  const date = input.date ?? today();
  const amount = sumSides(stored).debit;

  tx.insert(vouchers).values({ id, kind, number, date, narration, accountId: counterId, amount }).run();
  tx.insert(voucherLines)
    .values(stored.map((l, i) => ({ id: Crypto.randomUUID(), voucherId: id, accountId: l.accountId, lineNo: i, debit: l.debit, credit: l.credit })))
    .run();

  const postingLines =
    kind === 'JV'
      ? buildVoucherPostings({ kind, narration, lines: stored }, sys)
      : buildVoucherPostings({ kind, narration, accountId: counterId!, accountName: counterName, amount }, sys);
  writePostings(tx, postingLines, { date, sourceType: 'voucher', sourceId: id, ref: number });
  return { id, number };
}

export function saveVoucher(input: VoucherInput) {
  const result = db.transaction((tx) => saveVoucherTx(tx, input));
  notifyDataChanged();
  return result;
}
