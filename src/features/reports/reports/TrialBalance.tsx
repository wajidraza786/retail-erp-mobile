import { View } from 'react-native';

import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useTrialBalance } from '@/db/hooks';
import { today } from '@/lib/dates';
import { dateLabelLong, fmt } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

import { trialBalanceReceipt } from '@/features/printing/reportReceipts';

import { ReportLayout } from '../components/ReportLayout';

export function TrialBalance() {
  const asOf = today();
  const d = useTrialBalance(asOf).data;
  if (!d) return null;
  return (
    <ReportLayout
      title="Trial Balance"
      period={`As of ${dateLabelLong(asOf)}`}
      color={colors.ink}
      heroLabel="Debit = Credit"
      hero={fmt(d.debit)}
      chip={d.balanced ? `Books are balanced · ${d.rows.length} accounts` : `Difference ${fmt(d.debit - d.credit)}`}
      printable={(b) => trialBalanceReceipt(d, asOf, b)}>
      <View style={{ backgroundColor: colors.white, borderRadius: 22, paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.lineStrong }}>
          <Txt size={11} w={700} color={colors.muted} style={{ flex: 1 }}>
            Account
          </Txt>
          <Txt size={11} w={700} color={colors.muted} align="right" style={{ width: 86 }}>
            Debit
          </Txt>
          <Txt size={11} w={700} color={colors.muted} align="right" style={{ width: 86 }}>
            Credit
          </Txt>
        </View>
        {d.rows.map((r) => (
          <Tap key={r.accountId} onPress={() => nav.ledger(r.accountId)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={12.5} w={600} numberOfLines={1}>
                {r.name}
              </Txt>
              <Txt mono size={10.5} color={colors.muted}>
                {r.code}
              </Txt>
            </View>
            <Txt size={12.5} tabular align="right" style={{ width: 86 }}>
              {r.debit ? fmt(r.debit) : ''}
            </Txt>
            <Txt size={12.5} tabular align="right" style={{ width: 86 }}>
              {r.credit ? fmt(r.credit) : ''}
            </Txt>
          </Tap>
        ))}
        <View style={{ flexDirection: 'row', paddingVertical: 12 }}>
          <Txt size={13} w={700} style={{ flex: 1 }}>
            Total
          </Txt>
          <Txt size={13} w={700} tabular align="right" style={{ width: 86 }}>
            {fmt(d.debit)}
          </Txt>
          <Txt size={13} w={700} tabular align="right" style={{ width: 86 }}>
            {fmt(d.credit)}
          </Txt>
        </View>
      </View>
    </ReportLayout>
  );
}
