import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Buttons';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import { ScreenHeader } from '@/components/ui/Headers';
import { Pill, statusLabel } from '@/components/ui/StatusPill';
import { Txt } from '@/components/ui/Txt';
import { useInvoice, useSettings } from '@/db/hooks';
import { isReturnKind } from '@/db/services/invoices';
import { dateLabelLong, fmt } from '@/lib/format';
import { invoiceReceipt } from '@/features/printing/documentReceipts';
import { PrintShareSheet } from '@/features/printing/PrintShareSheet';
import { INVOICE_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { colors, shadow } from '@/theme/tokens';

export function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: inv, isLoading } = useInvoice(id);
  const settings = useSettings().data;
  const [sheet, setSheet] = useState(false);
  if (isLoading) return <Loading />;
  if (!inv) return <EmptyState text="This invoice could not be found." />;

  const K = INVOICE_META[inv.kind];
  const ret = isReturnKind(inv.kind);
  const status = inv.status === 'partial' ? 'Partly paid' : statusLabel(inv.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader kicker={K.title} title={inv.number} color={K.color} overlap right={<Pill label={status} bg={colors.white} fg={K.color} padH={11} padV={5} />} />
      <ScrollView style={{ flex: 1, marginTop: -56 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={[{ backgroundColor: colors.white, borderRadius: 24, padding: 18 }, shadow.card]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt size={12} color={colors.muted}>
                {K.party === 'customer' ? 'Customer' : 'Supplier'}
              </Txt>
              <Txt size={16} w={700} style={{ marginTop: 2 }}>
                {inv.partyName}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt size={12} color={colors.muted}>
                Date
              </Txt>
              <Txt size={14} w={600} style={{ marginTop: 2 }}>
                {dateLabelLong(inv.date)}
              </Txt>
            </View>
          </View>
          <View style={{ borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineDashed, marginTop: 16, marginBottom: 4 }} />
          {inv.lines.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
              <View style={{ flex: 1 }}>
                <Txt size={14} w={600}>
                  {l.name}
                </Txt>
                <Txt size={12} color={colors.muted} style={{ marginTop: 1 }}>
                  {l.qty} × {fmt(l.rate)}
                </Txt>
              </View>
              <Txt size={14} w={700} tabular>
                {fmt(l.qty * l.rate)}
              </Txt>
            </View>
          ))}
          <Row label="Subtotal" value={fmt(inv.subtotal)} />
          <Row label="Discount" value={inv.discount ? `−${fmt(inv.discount)}` : 'Rs 0'} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.lineStrong, marginTop: 6 }}>
            <Txt w={700}>Total</Txt>
            <Txt display={800} size={26} tabular>
              {fmt(inv.total)}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Txt size={11} color={colors.muted}>
                {K.paidView}
              </Txt>
              <Txt size={15} w={700} tabular style={{ marginTop: 2 }}>
                {fmt(inv.paid)}
              </Txt>
            </View>
            <View style={{ flex: 1, backgroundColor: K.light, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Txt size={11} color={colors.neutralText}>
                {K.dueLabel}
              </Txt>
              <Txt size={15} w={700} color={K.color} tabular style={{ marginTop: 2 }}>
                {fmt(inv.due)}
              </Txt>
            </View>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 14 }}>
          {!ret ? (
            <Button
              label={inv.kind === 'SI' ? 'Customer returned items' : 'Return items to supplier'}
              icon="returnArrow"
              onPress={() => nav.newInvoice(inv.kind === 'SI' ? 'SR' : 'PR', { sourceInvoiceId: inv.id })}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={K.party === 'customer' ? 'Customer ledger' : 'Supplier ledger'}
              bg={colors.white}
              fg={colors.ink}
              height={50}
              size={14}
              style={{ flex: 1 }}
              onPress={() => inv.partyAccountId && nav.ledger(inv.partyAccountId)}
            />
            <Button label="Print / Share" icon="printer" bg={colors.white} fg={colors.ink} height={50} size={14} style={{ flex: 1 }} onPress={() => setSheet(true)} />
          </View>
        </View>
      </ScrollView>
      <PrintShareSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        build={() => invoiceReceipt(inv, { businessName: settings?.businessName ?? '', footer: settings?.receiptFooter ?? '' })}
        phone={inv.partyPhone}
        partyName={inv.partyName}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingTop: label === 'Subtotal' ? 10 : 4 }}>
      <Txt size={14} color={colors.muted}>
        {label}
      </Txt>
      <Txt size={14} color={colors.muted} tabular>
        {value}
      </Txt>
    </View>
  );
}
