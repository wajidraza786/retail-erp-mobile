import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/Feedback';
import { FilterChips } from '@/components/ui/FilterChips';
import { Icon } from '@/components/ui/Icon';
import { SearchField } from '@/components/ui/SearchField';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useGeneralLedger, useLedger } from '@/db/hooks';
import { ACCOUNT_TYPE_LABEL } from '@/db/reports/generalLedger';
import type { AccountType } from '@/db/schema';
import { dateLabel, fmt, fmtParen, plural } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

import { generalLedgerReceipt } from '@/features/printing/reportReceipts';

import { ExpandAll, ReportLayout } from '../components/ReportLayout';

type Summary = NonNullable<ReturnType<typeof useGeneralLedger>['data']>['accounts'][number];

export function GeneralLedger() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<AccountType | 'all'>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const d = useGeneralLedger(type, q).data;
  const accounts = d?.accounts ?? [];
  const allOpen = accounts.length > 0 && accounts.every((a) => open.has(a.id));
  const diff = (d?.totalDebit ?? 0) - (d?.totalCredit ?? 0);

  return (
    <ReportLayout
      title="General Ledger"
      period="All entries to date"
      color={colors.accounts}
      heroLabel="Total debits = total credits"
      hero={fmt(d?.totalDebit ?? 0)}
      chip={`${d?.accountCount ?? 0} accounts · ${diff === 0 ? 'balanced' : `off by ${fmt(diff)}`}`}
      printable={d ? (b) => generalLedgerReceipt(d, b) : undefined}>
      <SearchField value={q} onChangeText={setQ} placeholder="Find an account" style={{ marginBottom: 10 }} />
      <FilterChips<AccountType | 'all'>
        chips={[
          { value: 'all', label: 'All' },
          { value: 'A', label: 'Assets' },
          { value: 'L', label: 'Liabilities' },
          { value: 'E', label: 'Equity' },
          { value: 'I', label: 'Income' },
          { value: 'X', label: 'Expenses' },
        ]}
        value={type}
        onChange={setType}
        style={{ marginHorizontal: -16, marginBottom: 10 }}
      />
      <View style={{ alignItems: 'flex-end', marginHorizontal: 4, marginBottom: 8 }}>
        <ExpandAll allOpen={allOpen} color={colors.accounts} onPress={() => setOpen(allOpen ? new Set() : new Set(accounts.map((a) => a.id)))} />
      </View>
      <View style={{ gap: 8 }}>
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            a={a}
            isOpen={open.has(a.id)}
            toggle={() =>
              setOpen((s) => {
                const n = new Set(s);
                if (n.has(a.id)) n.delete(a.id);
                else n.add(a.id);
                return n;
              })
            }
          />
        ))}
      </View>
      {accounts.length === 0 ? <EmptyState text="No accounts match" /> : null}
    </ReportLayout>
  );
}

const COLS = { dr: 62, cr: 62, bal: 70 };

function AccountCard({ a, isOpen, toggle }: { a: Summary; isOpen: boolean; toggle: () => void }) {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden' }}>
      <Tap onPress={toggle} accessibilityState={{ expanded: isOpen }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 14 }}>
        <Icon name="chevron" size={14} color={colors.muted} strokeWidth={2.6} rotate={isOpen ? 90 : 0} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={14.5} w={700} numberOfLines={1}>
            {a.name}
          </Txt>
          <Txt size={11.5} color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
            <Txt mono size={11.5} color={colors.muted}>
              {a.code}
            </Txt>
            {` · ${ACCOUNT_TYPE_LABEL[a.type]} · ${plural(a.entries, 'entry', 'entries')}`}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt display={700} size={14.5} tabular>
            {fmtParen(a.closing)}
          </Txt>
          <Txt mono={600} size={10.5} color={colors.muted}>
            {a.side}
          </Txt>
        </View>
      </Tap>
      {isOpen ? <AccountEntries a={a} /> : null}
    </View>
  );
}

/** Entries load only when a card is expanded. */
function AccountEntries({ a }: { a: Summary }) {
  const d = useLedger(a.id).data;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.lineStrong, paddingHorizontal: 14 }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingTop: 9, paddingBottom: 6 }}>
        <Txt size={10.5} w={700} color={colors.muted} style={{ flex: 1 }}>
          Date · Particulars
        </Txt>
        <Txt size={10.5} w={700} color={colors.muted} align="right" style={{ width: COLS.dr }}>
          Debit
        </Txt>
        <Txt size={10.5} w={700} color={colors.muted} align="right" style={{ width: COLS.cr }}>
          Credit
        </Txt>
        <Txt size={10.5} w={700} color={colors.muted} align="right" style={{ width: COLS.bal }}>
          Balance
        </Txt>
      </View>
      {d?.rows.map((r) => {
        const ob = r.sourceType === 'opening';
        const memo = ob ? 'Opening balance' : r.memo + (r.counterparty && r.counterparty !== r.memo ? ` · ${r.counterparty}` : '');
        return (
          <Tap
            key={r.id}
            onPress={ob ? undefined : () => nav.source(r.sourceType, r.sourceId)}
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={11.5} w={600} numberOfLines={1}>
                {memo}
              </Txt>
              <Txt size={10.5} color={colors.muted}>
                {dateLabel(r.date)} · {ob ? 'B/F' : r.ref}
              </Txt>
            </View>
            <Txt size={11.5} tabular align="right" style={{ width: COLS.dr }} numberOfLines={1} adjustsFontSizeToFit>
              {r.debit ? fmt(r.debit) : ''}
            </Txt>
            <Txt size={11.5} tabular align="right" style={{ width: COLS.cr }} numberOfLines={1} adjustsFontSizeToFit>
              {r.credit ? fmt(r.credit) : ''}
            </Txt>
            <Txt size={11.5} w={700} tabular align="right" style={{ width: COLS.bal }} numberOfLines={1} adjustsFontSizeToFit>
              {fmtParen(r.running)}
            </Txt>
          </Tap>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 9, borderTopWidth: 1.5, borderTopColor: 'rgba(23,22,28,0.12)' }}>
        <Txt size={11.5} w={700} style={{ flex: 1 }}>
          Totals
        </Txt>
        <Txt size={11.5} w={700} tabular align="right" style={{ width: COLS.dr }} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(a.debit)}
        </Txt>
        <Txt size={11.5} w={700} tabular align="right" style={{ width: COLS.cr }} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(a.credit)}
        </Txt>
        <Txt size={11.5} w={700} tabular align="right" style={{ width: COLS.bal }} numberOfLines={1} adjustsFontSizeToFit>
          {fmtParen(a.closing)}
        </Txt>
      </View>
      <Button label="Open account ledger" bg={colors.accountsLight} fg={colors.accounts} height={40} radius={12} size={13} style={{ marginTop: 2, marginBottom: 12 }} onPress={() => nav.ledger(a.id)} />
    </View>
  );
}
