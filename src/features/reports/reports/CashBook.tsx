import { View } from 'react-native';

import { EmptyState } from '@/components/ui/Feedback';
import { LedgerRow } from '@/components/ui/Rows';
import { useCashBook } from '@/db/hooks';
import { monthStart, today } from '@/lib/dates';
import { dateBlock, fmt, fmtDelta, plural, rangeLabel } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

import { cashBookReceipt } from '@/features/printing/reportReceipts';

import { MiniTile, ReportLayout } from '../components/ReportLayout';

export function CashBook() {
  const range = { from: monthStart(), to: today() };
  const d = useCashBook(range).data;
  return (
    <ReportLayout title="Cash Book" period={rangeLabel(range.from, range.to)} color={colors.sales} heroLabel="Closing cash in hand" hero={fmt(d?.closing ?? 0)} chip={plural(d?.rows.length ?? 0, 'entry', 'entries')} printable={d ? (b) => cashBookReceipt(d, range, b) : undefined}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <MiniTile label="Opening" value={fmt(d?.opening ?? 0)} />
        <MiniTile label="Money in" value={fmt(d?.moneyIn ?? 0)} bg={colors.salesLight} fg={colors.salesDark} />
        <MiniTile label="Money out" value={fmt(d?.moneyOut ?? 0)} bg={colors.reportLight} fg={colors.danger} />
      </View>
      <View style={{ backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden' }}>
        {d?.rows.length === 0 ? <EmptyState text="No cash entries this month" /> : null}
        {d?.rows.map((r) => {
          const { day, mon } = dateBlock(r.date);
          return (
            <LedgerRow
              key={r.id}
              compact
              day={day}
              mon={mon}
              title={r.who}
              ref={`${r.ref} · ${r.memo}`}
              amount={fmtDelta(r.amount)}
              amountColor={r.amount >= 0 ? colors.sales : colors.report}
              balance={fmt(r.running)}
              onPress={() => nav.source(r.sourceType, r.sourceId)}
            />
          );
        })}
      </View>
    </ReportLayout>
  );
}
