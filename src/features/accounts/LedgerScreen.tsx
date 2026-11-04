import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Buttons';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { HeroFigure, ScreenHeader } from '@/components/ui/Headers';
import { LedgerRow } from '@/components/ui/Rows';
import { Txt } from '@/components/ui/Txt';
import { useLedger } from '@/db/hooks';
import { dateBlock, fmt, fmtDelta, fmtParen, plural } from '@/lib/format';
import { paisaToInput } from '@/lib/money';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

/** Any account's ledger, including customer and supplier sub-accounts. */
export function LedgerScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useLedger(accountId);
  if (isLoading) return <Loading />;
  if (!data) return <EmptyState text="This account could not be found." />;

  const { account, balance } = data;
  const isAR = account.partyType === 'customer';
  const isAP = account.partyType === 'supplier';
  const color = isAR ? colors.sales : isAP ? colors.purchase : colors.accounts;
  const label = isAR
    ? balance > 0
      ? 'Owes you'
      : balance < 0
        ? 'Paid in advance'
        : 'All settled'
    : isAP
      ? balance > 0
        ? 'You owe'
        : balance < 0
          ? 'Paid in advance'
          : 'All settled'
      : 'Current balance';
  const rows = [...data.rows].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader kicker={account.code} kickerMono title={account.name} color={color} style={{ paddingBottom: 20 }}>
        <HeroFigure label={label} value={isAR || isAP ? fmt(balance) : fmtParen(balance)} />
        {isAR || isAP ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button
              label={isAR ? 'Receive payment' : 'Make payment'}
              bg={colors.white}
              fg={color}
              height={44}
              radius={14}
              size={14}
              style={{ flex: 1 }}
              onPress={() => nav.newVoucher(isAR ? 'CRV' : 'CPV', { accountId: account.id, ...(balance > 0 ? { amount: paisaToInput(balance) } : {}) })}
            />
            <Button
              label={isAR ? 'New sale' : 'New purchase'}
              bg={colors.onColor20}
              height={44}
              radius={14}
              size={14}
              style={{ flex: 1 }}
              onPress={() => nav.newInvoice(isAR ? 'SI' : 'PI', { partyId: (account.customerId ?? account.supplierId) ?? undefined })}
            />
          </View>
        ) : null}
      </ScreenHeader>
      <FlashList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 6, marginBottom: 8 }}>
            <Txt size={12} w={600} color={colors.muted}>
              {plural(rows.length, 'entry', 'entries')}
            </Txt>
            <Txt size={12} w={600} color={colors.muted}>
              Running balance
            </Txt>
          </View>
        }
        ListEmptyComponent={<EmptyState text="No entries yet" />}
        renderItem={({ item, index }) => {
          const { day, mon } = dateBlock(item.date);
          const opening = item.sourceType === 'opening';
          return (
            <View
              style={{
                backgroundColor: colors.white,
                borderTopLeftRadius: index === 0 ? 22 : 0,
                borderTopRightRadius: index === 0 ? 22 : 0,
                borderBottomLeftRadius: index === rows.length - 1 ? 22 : 0,
                borderBottomRightRadius: index === rows.length - 1 ? 22 : 0,
                overflow: 'hidden',
              }}>
              <LedgerRow
                day={day}
                mon={mon}
                title={item.memo}
                ref={opening ? 'Brought forward' : item.ref}
                amount={fmtDelta(item.delta)}
                amountColor={item.delta >= 0 ? colors.ink : colors.report}
                balance={fmtParen(item.running)}
                onPress={opening ? undefined : () => nav.source(item.sourceType, item.sourceId)}
              />
            </View>
          );
        }}
      />
    </View>
  );
}
