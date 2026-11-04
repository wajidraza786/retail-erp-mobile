import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { View } from 'react-native';

import { Fab } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/Feedback';
import { HeaderStats, ModuleHeader } from '@/components/ui/Headers';
import { DocRow, PartyRow } from '@/components/ui/Rows';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useInvoices, useParties, useTradeStats } from '@/db/hooks';
import type { InvoiceRowData } from '@/db/queries/documents';
import type { PartyRowData } from '@/db/queries/parties';
import { today } from '@/lib/dates';
import { dateLabel, fmt, initials, monthLabel } from '@/lib/format';
import { QuickAddSheet } from '@/features/parties/QuickAddSheet';
import { INVOICE_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { useUi, type TradeSeg } from '@/store/ui';
import { colors } from '@/theme/tokens';

type Side = 'sales' | 'purchase';
type Row = { type: 'doc'; doc: InvoiceRowData } | { type: 'party'; party: PartyRowData };

/** Sales and Purchase tabs share one layout; only colour, kinds and copy differ (PRD §7.2). */
export function TradeTabScreen({ side }: { side: Side }) {
  const isS = side === 'sales';
  const seg = useUi((s) => (isS ? s.salesSeg : s.purchaseSeg));
  const setSeg = useUi((s) => (isS ? s.setSalesSeg : s.setPurchaseSeg));
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const color = isS ? colors.sales : colors.purchase;
  const light = isS ? colors.salesLight : colors.purchaseLight;
  const kind = isS ? (seg === 'returns' ? 'SR' : 'SI') : seg === 'returns' ? 'PR' : 'PI';
  const partyType = isS ? 'customer' : 'supplier';

  const stats = useTradeStats(side).data;
  const docs = useInvoices([kind], q).data ?? [];
  const parties = useParties(partyType, q).data ?? [];

  const rows: Row[] = seg === 'parties' ? parties.map((p) => ({ type: 'party', party: p })) : docs.map((d) => ({ type: 'doc', doc: d }));

  const changeSeg = (s: TradeSeg) => {
    setSeg(s);
    setQ('');
  };

  const header = (
    <View>
      <ModuleHeader title={isS ? 'Sales' : 'Purchase'} right={monthLabel(today())} color={color}>
        <HeaderStats
          items={[
            { label: isS ? 'Net sales this month' : 'Net purchases this month', value: fmt(stats?.net ?? 0) },
            { label: isS ? 'To receive' : 'To pay', value: fmt(stats?.outstanding ?? 0) },
          ]}
        />
        <View style={{ marginTop: 14 }}>
          <SegmentedControl<TradeSeg>
            value={seg}
            onChange={changeSeg}
            activeColor={color}
            options={[
              { value: 'invoices', label: 'Invoices' },
              { value: 'returns', label: 'Returns' },
              { value: 'parties', label: isS ? 'Customers' : 'Suppliers' },
            ]}
          />
        </View>
      </ModuleHeader>
      <SearchField
        value={q}
        onChangeText={setQ}
        placeholder={seg === 'parties' ? `Search ${isS ? 'customers' : 'suppliers'}` : 'Search by name or number'}
        style={{ marginTop: 14, marginBottom: 10, marginHorizontal: 16 }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlashList
        data={rows}
        keyExtractor={(r) => (r.type === 'doc' ? r.doc.id : r.party.id)}
        getItemType={(r) => r.type}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState text="Nothing here yet" />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {item.type === 'doc' ? (
              <DocRow
                kind={item.doc.kind}
                color={INVOICE_META[item.doc.kind].color}
                light={INVOICE_META[item.doc.kind].light}
                title={item.doc.partyName}
                sub={`${item.doc.number} · ${dateLabel(item.doc.date)} · ${item.doc.qty} pcs`}
                amount={fmt(item.doc.total)}
                status={item.doc.status}
                onPress={() => nav.invoice(item.doc.id)}
              />
            ) : (
              <PartyRow
                initials={initials(item.party.name)}
                name={item.party.name}
                phone={item.party.phone ?? '—'}
                balance={fmt(item.party.balance)}
                balanceLabel={item.party.balance > 0 ? (isS ? 'owes you' : 'you owe') : item.party.balance < 0 ? 'in advance' : 'settled'}
                balanceColor={item.party.balance > 0 ? color : colors.muted}
                color={color}
                light={light}
                onPress={() => nav.ledger(item.party.accountId)}
              />
            )}
          </View>
        )}
      />
      <Fab
        label={seg === 'invoices' ? 'New invoice' : seg === 'returns' ? 'New return' : isS ? 'Add customer' : 'Add supplier'}
        onPress={() => (seg === 'parties' ? setAdding(true) : nav.newInvoice(kind))}
      />
      <QuickAddSheet type={adding ? partyType : null} onClose={() => setAdding(false)} />
    </View>
  );
}
