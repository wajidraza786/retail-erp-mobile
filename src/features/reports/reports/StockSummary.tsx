import { useState } from 'react';
import { View } from 'react-native';

import { DateRangeBar } from '@/components/ui/DateRangeBar';
import { EmptyState } from '@/components/ui/Feedback';
import { FilterChips } from '@/components/ui/FilterChips';
import { SearchField } from '@/components/ui/SearchField';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useCategories, useStockSummary } from '@/db/hooks';
import { fmt, fmtQty, plural, rangeLabel } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { useReportRange } from '@/store/reportRange';
import { colors } from '@/theme/tokens';

import { stockSummaryReceipt } from '@/features/printing/reportReceipts';

import { ReportLayout, TableHead } from '../components/ReportLayout';

const W = { n: 38, close: 46 };

export function StockSummary() {
  const { from, to } = useReportRange();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const categories = useCategories().data ?? [];
  const d = useStockSummary({ from, to }, category, q).data;
  const rows = d?.rows ?? [];

  return (
    <ReportLayout
      title="Stock Summary"
      period={rangeLabel(from, to)}
      color={colors.inventoryDark}
      heroLabel="Closing stock value (at cost)"
      hero={fmt(d?.totals.value ?? 0)}
      chip={`${plural(rows.length, 'product')} · ${d?.lowCount ?? 0} running low`}
      printable={d ? (b) => stockSummaryReceipt(d, { from, to }, b) : undefined}>
      <DateRangeBar>
        <SearchField soft value={q} onChangeText={setQ} placeholder="Product, SKU or brand" style={{ marginTop: 10 }} />
      </DateRangeBar>
      <FilterChips
        chips={[{ value: null, label: 'All' }, ...categories.map((c) => ({ value: c.id as string | null, label: c.name }))]}
        value={category}
        onChange={setCategory}
        style={{ marginTop: 10, marginHorizontal: -16 }}
      />
      <View style={{ backgroundColor: colors.white, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12, marginTop: 10 }}>
        <TableHead
          first="Product"
          cols={[
            { label: 'Open', width: W.n },
            { label: 'In', width: W.n },
            { label: 'Out', width: W.n },
            { label: 'Close', width: W.close },
          ]}
        />
        {rows.map((r) => (
          <Tap
            key={r.id}
            onPress={() => nav.report('stockledger', { productId: r.id })}
            style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={12.5} w={600} numberOfLines={1}>
                {r.name}
              </Txt>
              <Txt size={10.5} color={colors.muted} numberOfLines={1}>
                {fmt(r.value)} · {r.sku} · {r.brandName}
              </Txt>
            </View>
            <Txt size={12.5} color={colors.muted} tabular align="right" style={{ width: W.n }}>
              {fmtQty(r.open)}
            </Txt>
            <Txt size={12.5} w={600} color={colors.sales} tabular align="right" style={{ width: W.n }}>
              +{fmtQty(r.qtyIn)}
            </Txt>
            <Txt size={12.5} w={600} color={colors.dangerStrong} tabular align="right" style={{ width: W.n }}>
              −{fmtQty(r.qtyOut)}
            </Txt>
            <View style={{ width: W.close, alignItems: 'flex-end' }}>
              <View style={{ minWidth: 34, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: r.isLowClose ? colors.reportLight : colors.neutralPill }}>
                <Txt size={12.5} w={700} color={r.isLowClose ? colors.danger : colors.ink} align="center" tabular>
                  {fmtQty(r.close)}
                </Txt>
              </View>
            </View>
          </Tap>
        ))}
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 11 }}>
          <Txt size={12.5} w={700} style={{ flex: 1 }}>
            Total pcs
          </Txt>
          <Txt size={12.5} w={700} tabular align="right" style={{ width: W.n }}>
            {fmtQty(d?.totals.open ?? 0)}
          </Txt>
          <Txt size={12.5} w={700} color={colors.sales} tabular align="right" style={{ width: W.n }}>
            +{fmtQty(d?.totals.qtyIn ?? 0)}
          </Txt>
          <Txt size={12.5} w={700} color={colors.dangerStrong} tabular align="right" style={{ width: W.n }}>
            −{fmtQty(d?.totals.qtyOut ?? 0)}
          </Txt>
          <Txt size={12.5} w={700} tabular align="right" style={{ width: W.close }}>
            {fmtQty(d?.totals.close ?? 0)}
          </Txt>
        </View>
      </View>
      {rows.length === 0 ? <EmptyState text="No products match" /> : null}
      <Txt size={12} color={colors.muted} style={{ marginTop: 10, marginHorizontal: 6 }}>
        Tap a product to open its stock ledger.
      </Txt>
    </ReportLayout>
  );
}
