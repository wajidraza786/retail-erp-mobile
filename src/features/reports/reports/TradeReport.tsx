import { useState } from 'react';
import { View } from 'react-native';

import { DateRangeBar } from '@/components/ui/DateRangeBar';
import { EmptyState } from '@/components/ui/Feedback';
import { ListRow } from '@/components/ui/Rows';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Txt } from '@/components/ui/Txt';
import { useParties, useTradeReport } from '@/db/hooks';
import type { TradeGroup, TradeSide } from '@/db/reports/salesPurchase';
import { dateLabel, fmt, fmtSigned, initials, plural, rangeLabel } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { useReportRange } from '@/store/reportRange';
import { colors, tints } from '@/theme/tokens';

import { tradeReceipt } from '@/features/printing/reportReceipts';

import { MiniTile, ReportLayout } from '../components/ReportLayout';

/** Sales Report and Purchase Report (same layout, different colour and labels). */
export function TradeReport({ side }: { side: TradeSide }) {
  const isS = side === 'sales';
  const color = isS ? colors.sales : colors.purchase;
  const light = isS ? colors.salesLight : colors.purchaseLight;
  const { from, to } = useReportRange();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<TradeGroup>('invoices');
  const d = useTradeReport(side, { from, to }, q).data;
  const parties = useParties(isS ? 'customer' : 'supplier').data ?? [];

  const openParty = (partyId: string) => {
    const acc = parties.find((p) => p.id === partyId)?.accountId;
    if (acc) nav.ledger(acc);
  };

  const count = !d ? 0 : group === 'invoices' ? d.docs.length : group === 'products' ? d.products.length : d.parties.length;
  const countLabel = group === 'invoices' ? plural(count, 'document') : group === 'products' ? plural(count, 'product') : plural(count, isS ? 'customer' : 'supplier');

  return (
    <ReportLayout
      title={isS ? 'Sales Report' : 'Purchase Report'}
      period={rangeLabel(from, to)}
      color={color}
      heroLabel={isS ? 'Net sales' : 'Net purchases'}
      hero={fmt(d?.net ?? 0)}
      chip={`${plural(d?.invoiceCount ?? 0, 'invoice')} · ${plural(d?.returnCount ?? 0, 'return')}`}
      printable={d ? (b) => tradeReceipt(d, side, group, { from, to }, b) : undefined}>
      <DateRangeBar withYesterday>
        <SearchField soft value={q} onChangeText={setQ} placeholder={isS ? 'Customer, product or invoice no.' : 'Supplier, product or invoice no.'} style={{ marginTop: 10 }} />
      </DateRangeBar>

      <View style={{ gap: 8, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniTile label={isS ? 'Sales' : 'Purchases'} value={fmt(d?.gross ?? 0)} />
          <MiniTile label="Returns" value={fmt(d?.returns ?? 0)} fg={colors.danger} labelColor={colors.muted} />
          <MiniTile label="Net" value={fmt(d?.net ?? 0)} bg={light} fg={color} labelColor={colors.neutralText} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniTile label={isS ? 'Received' : 'Paid'} value={fmt(d?.settled ?? 0)} />
          <MiniTile label={isS ? 'Still to receive' : 'Still to pay'} value={fmt(d?.due ?? 0)} />
          <MiniTile label={isS ? 'Gross profit' : 'Avg. invoice'} value={isS ? fmtSigned(d?.grossProfit ?? 0) : fmt(d?.avgInvoice ?? 0)} />
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        <SegmentedControl<TradeGroup>
          variant="onWhite"
          activeColor={color}
          value={group}
          onChange={setGroup}
          options={[
            { value: 'invoices', label: 'Invoices' },
            { value: 'products', label: 'Products' },
            { value: 'parties', label: isS ? 'Customers' : 'Suppliers' },
          ]}
        />
      </View>
      <Txt size={12} w={600} color={colors.muted} style={{ marginTop: 12, marginBottom: 8, marginHorizontal: 6 }}>
        {countLabel}
      </Txt>

      <View style={{ gap: 8 }}>
        {group === 'invoices' &&
          d?.docs.map((i) => {
            const ret = i.kind === d.returnKind;
            return (
              <ListRow
                key={i.id}
                badge={i.kind}
                badgeBg={ret ? colors.neutralChip : light}
                badgeFg={ret ? colors.neutralText : color}
                badgeSize={40}
                title={i.partyName}
                sub={`${i.number} · ${dateLabel(i.date)} · ${i.qty} pcs`}
                right={(ret ? '−' : '') + fmt(i.total)}
                rightColor={ret ? colors.report : colors.ink}
                rightSub={ret ? 'Return' : i.due > 0 ? `${fmt(i.due)} due` : 'Paid'}
                onPress={() => nav.invoice(i.id)}
              />
            );
          })}
        {group === 'products' &&
          d?.products.map((p) => (
            <ListRow
              key={p.productId}
              badge={initials(p.brand)}
              badgeBg={tints[p.categoryIndex % tints.length]}
              badgeFg={colors.ink}
              badgeSize={40}
              title={p.name}
              sub={`${p.qty} pcs · avg ${fmt(p.qty ? Math.round(p.amount / p.qty) : 0)}`}
              right={fmtSigned(p.amount)}
              rightSub={isS ? `Profit ${fmtSigned(p.amount - p.cost)}` : p.brand}
              onPress={() => nav.product(p.productId)}
            />
          ))}
        {group === 'parties' &&
          d?.parties.map((p) => (
            <ListRow
              key={p.partyId}
              badge={initials(p.name)}
              badgeBg={light}
              badgeFg={color}
              badgeSize={40}
              title={p.name}
              sub={plural(p.invoices, 'invoice')}
              right={fmtSigned(p.amount)}
              rightSub={p.due > 0 ? `${fmt(p.due)} due` : 'Settled'}
              onPress={() => openParty(p.partyId)}
            />
          ))}
      </View>
      {count === 0 ? <EmptyState text="Nothing in this date range" /> : null}
    </ReportLayout>
  );
}
