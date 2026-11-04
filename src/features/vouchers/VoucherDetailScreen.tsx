import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Buttons';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { ScreenHeader } from '@/components/ui/Headers';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useSettings, useVoucher } from '@/db/hooks';
import { dateLabelLong, fmt } from '@/lib/format';
import { voucherReceipt } from '@/features/printing/documentReceipts';
import { PrintShareSheet } from '@/features/printing/PrintShareSheet';
import { VOUCHER_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { colors, shadow } from '@/theme/tokens';

export function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: v, isLoading } = useVoucher(id);
  const settings = useSettings().data;
  const [sheet, setSheet] = useState(false);
  if (isLoading) return <Loading />;
  if (!v) return <EmptyState text="This voucher could not be found." />;
  const K = VOUCHER_META[v.kind];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader kicker={K.title} title={v.number} color={K.color} overlap />
      <ScrollView style={{ flex: 1, marginTop: -56 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={[{ backgroundColor: colors.white, borderRadius: 24, padding: 18 }, shadow.card]}>
          <Txt size={12} color={colors.muted}>
            {dateLabelLong(v.date)}
          </Txt>
          <Txt size={17} w={700} lh={22} style={{ marginTop: 4 }}>
            {v.narration}
          </Txt>
          <Txt display={800} size={32} tabular style={{ marginTop: 10 }}>
            {fmt(v.amount)}
          </Txt>
          <View style={{ flexDirection: 'row', paddingTop: 14, paddingBottom: 6, marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.lineStrong }}>
            <Txt size={11} w={700} color={colors.muted} style={{ flex: 1 }}>
              Account
            </Txt>
            <Txt size={11} w={700} color={colors.muted} align="right" style={{ width: 84 }}>
              Debit
            </Txt>
            <Txt size={11} w={700} color={colors.muted} align="right" style={{ width: 84 }}>
              Credit
            </Txt>
          </View>
          {v.lines.map((l, i) => (
            <Tap key={i} onPress={() => nav.ledger(l.accountId)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13} w={600} numberOfLines={1}>
                  {l.name}
                </Txt>
                <Txt mono size={11} color={colors.muted}>
                  {l.code}
                </Txt>
              </View>
              <Txt size={13} tabular align="right" style={{ width: 84 }}>
                {l.debit ? fmt(l.debit) : ''}
              </Txt>
              <Txt size={13} tabular align="right" style={{ width: 84 }}>
                {l.credit ? fmt(l.credit) : ''}
              </Txt>
            </Tap>
          ))}
        </View>
        <Button label="Print / Share" icon="printer" style={{ marginTop: 14 }} onPress={() => setSheet(true)} />
      </ScrollView>
      <PrintShareSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        build={() => voucherReceipt(v, { businessName: settings?.businessName ?? '', footer: settings?.receiptFooter ?? '' })}
        phone={v.partyPhone}
        partyName={v.lines.find((l) => l.accountId === v.accountId)?.name}
      />
    </View>
  );
}
