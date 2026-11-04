import { useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { BottomSheetList, useSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Buttons';
import { DateRangeBar } from '@/components/ui/DateRangeBar';
import { EmptyState } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Pill } from '@/components/ui/StatusPill';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useProducts, useStockLedger, useStockLedgerAll } from '@/db/hooks';
import type { MovementRow } from '@/db/reports/stockLedger';
import { dateBlock, dateLabel, fmt, fmtQty, initials, plural, rangeLabel } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { useReportRange } from '@/store/reportRange';
import { colors, tints } from '@/theme/tokens';

import { stockLedgerAllReceipt, stockLedgerReceipt } from '@/features/printing/reportReceipts';

import { ExpandAll, ReportLayout } from '../components/ReportLayout';

type Mode = 'one' | 'all';

function Tiles({ open, qtyIn, qtyOut, close }: { open: number; qtyIn: number; qtyOut: number; close: number }) {
  const tiles: [string, string, string, string][] = [
    ['Opening', fmtQty(open), colors.white, colors.ink],
    ['In', `+${fmtQty(qtyIn)}`, colors.salesLight, colors.salesDark],
    ['Out', `−${fmtQty(qtyOut)}`, colors.reportLight, colors.danger],
    ['Closing', fmtQty(close), colors.inventoryLight, colors.stockLedger],
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
      {tiles.map(([l, v, bg, fg]) => (
        <View key={l} style={{ flex: 1, backgroundColor: bg, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10 }}>
          <Txt size={10.5} color={bg === colors.white ? colors.muted : fg}>
            {l}
          </Txt>
          <Txt size={15} w={700} color={fg} tabular>
            {v}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function StockLedger({ initialProductId }: { initialProductId?: string }) {
  const { from, to } = useReportRange();
  const range = { from, to };
  const [mode, setMode] = useState<Mode>('one');
  const [q, setQ] = useState('');
  const products = useProducts().data ?? [];
  const [picked, setPicked] = useState<string | undefined>(initialProductId);
  const productId = picked ?? products[0]?.id;
  const product = products.find((p) => p.id === productId);
  const one = useStockLedger(mode === 'one' ? productId : undefined, range, q).data;
  const all = useStockLedgerAll(range, q, mode === 'all').data;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sheet = useSheet();

  const header =
    mode === 'all'
      ? { heroLabel: 'All products · closing stock', hero: `${fmtQty(all?.close ?? 0)} pcs`, chip: `Worth ${fmt(all?.value ?? 0)} at cost` }
      : { heroLabel: product?.name ?? 'No products yet', hero: `${fmtQty(one?.close ?? 0)} pcs in stock`, chip: `Worth ${fmt((one?.close ?? 0) * (product?.costPrice ?? 0))} at cost` };

  const cards = all?.cards ?? [];
  const allOpen = cards.length > 0 && cards.every((c) => open.has(c.product.id));

  return (
    <ReportLayout
      title="Stock Ledger"
      period={rangeLabel(from, to)}
      color={colors.stockLedger}
      {...header}
      printable={
        mode === 'all'
          ? all
            ? (b) => stockLedgerAllReceipt(all, range, b)
            : undefined
          : one && product
            ? (b) => stockLedgerReceipt(one, product, range, b)
            : undefined
      }>
      <View style={{ marginBottom: 10 }}>
        <SegmentedControl<Mode>
          variant="onWhite"
          activeColor={colors.inventoryDark}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'one', label: 'One product' },
            { value: 'all', label: 'All products' },
          ]}
        />
      </View>

      {mode === 'one' && product ? (
        <Tap onPress={() => sheet.show(true)} style={{ backgroundColor: colors.white, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Badge label={initials(product.brandName)} bg={tints[product.categoryIndex % tints.length]} size={46} radius={14} fontSize={14} weight={800} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={11} color={colors.muted}>
              Product
            </Txt>
            <Txt size={15} w={700} numberOfLines={1}>
              {product.name}
            </Txt>
            <Txt size={11.5} color={colors.muted} numberOfLines={1}>
              {product.sku} · {product.brandName} · reorder at {product.reorderLevel}
            </Txt>
          </View>
          <Pill label="Change" bg={colors.inventoryLight} fg={colors.inventoryDark} padH={10} padV={6} />
        </Tap>
      ) : null}

      <DateRangeBar>
        <SearchField soft value={q} onChangeText={setQ} placeholder="Product, party, invoice no. or type" style={{ marginTop: 10 }} />
      </DateRangeBar>

      {mode === 'one' ? (
        <>
          <Tiles open={one?.open ?? 0} qtyIn={one?.qtyIn ?? 0} qtyOut={one?.qtyOut ?? 0} close={one?.close ?? 0} />
          <View style={{ backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden', marginTop: 10 }}>
            <MoveHead />
            {one?.rows.map((r) => <MoveRow key={r.id} r={r} withDateBlock />)}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.bgSoft }}>
              <Txt size={12.5} w={600} color={colors.muted} style={{ flex: 1 }}>
                Opening stock b/f
              </Txt>
              <Txt size={12.5} w={700} tabular>
                {fmtQty(one?.open ?? 0)}
              </Txt>
            </View>
          </View>
          {one && one.rows.length === 0 ? <EmptyState text="No movements in this range" /> : null}
        </>
      ) : (
        <>
          <Tiles open={all?.open ?? 0} qtyIn={all?.qtyIn ?? 0} qtyOut={all?.qtyOut ?? 0} close={all?.close ?? 0} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8, marginHorizontal: 4 }}>
            <Txt size={12} w={600} color={colors.muted}>
              {plural(cards.length, 'product')}
            </Txt>
            <ExpandAll allOpen={allOpen} color={colors.inventoryDark} onPress={() => setOpen(allOpen ? new Set() : new Set(cards.map((c) => c.product.id)))} />
          </View>
          <View style={{ gap: 8 }}>
            {cards.map((c) => {
              const isOpen = open.has(c.product.id);
              const low = c.close <= c.product.reorderLevel;
              return (
                <View key={c.product.id} style={{ backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden' }}>
                  <Tap
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() =>
                      setOpen((s) => {
                        const n = new Set(s);
                        if (n.has(c.product.id)) n.delete(c.product.id);
                        else n.add(c.product.id);
                        return n;
                      })
                    }
                    style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Icon name="chevron" size={14} color={colors.muted} strokeWidth={2.6} rotate={isOpen ? 90 : 0} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Txt size={14} w={700} numberOfLines={1}>
                          {c.product.name}
                        </Txt>
                        <Txt size={11} color={colors.muted} numberOfLines={1}>
                          {c.product.sku} · {plural(c.movementCount, 'movement')} · {fmt(c.value)}
                        </Txt>
                      </View>
                      <View style={{ minWidth: 40, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: low ? colors.reportLight : colors.inventoryLight }}>
                        <Txt size={14} w={700} color={low ? colors.danger : colors.stockLedger} align="center" tabular>
                          {fmtQty(c.close)}
                        </Txt>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, marginLeft: 24 }}>
                      <Txt size={12} color={colors.muted}>
                        Open <Txt size={12} w={700}>{fmtQty(c.open)}</Txt>
                      </Txt>
                      <Txt size={12} color={colors.muted}>
                        In <Txt size={12} w={700} color={colors.sales}>+{fmtQty(c.qtyIn)}</Txt>
                      </Txt>
                      <Txt size={12} color={colors.muted}>
                        Out <Txt size={12} w={700} color={colors.dangerStrong}>−{fmtQty(c.qtyOut)}</Txt>
                      </Txt>
                    </View>
                  </Tap>
                  {isOpen ? (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.lineStrong }}>
                      <MoveHead />
                      <View style={{ flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 14, backgroundColor: colors.bgSoft }}>
                        <Txt size={11.5} w={600} color={colors.muted} style={{ flex: 1 }}>
                          Opening stock b/f
                        </Txt>
                        <Txt size={11.5} w={700} tabular>
                          {fmtQty(c.open)}
                        </Txt>
                      </View>
                      {c.rows.map((r) => (
                        <MoveRow key={r.id} r={r} />
                      ))}
                      {c.rows.length === 0 ? (
                        <Txt size={12} color={colors.muted} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                          No movements in this range
                        </Txt>
                      ) : null}
                      <Button
                        label="Open product ledger"
                        bg={colors.inventoryLight}
                        fg={colors.stockLedger}
                        height={38}
                        radius={12}
                        size={13}
                        style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 12 }}
                        onPress={() => {
                          setPicked(c.product.id);
                          setMode('one');
                          setQ('');
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          {all && cards.length === 0 ? <EmptyState text="No products match" /> : null}
        </>
      )}

      <BottomSheetList
        visible={sheet.visible}
        onClose={sheet.hide}
        title="Choose product"
        search={sheet.search}
        onSearch={sheet.setSearch}
        items={products
          .filter((p) => !sheet.search || `${p.name} ${p.sku}`.toLowerCase().includes(sheet.search.toLowerCase()))
          .map((p) => ({
            type: 'item',
            key: p.id,
            badge: initials(p.brandName),
            badgeBg: tints[p.categoryIndex % tints.length],
            badgeFg: colors.ink,
            title: p.name,
            sub: `${p.sku} · ${p.brandName}`,
            right: `${p.stock} pcs`,
            rightSub: p.isLow ? 'low' : undefined,
            rightSubColor: colors.dangerStrong,
            selected: p.id === productId,
            onPress: () => {
              setPicked(p.id);
              setQ('');
              sheet.hide();
            },
          }))}
      />
    </ReportLayout>
  );
}

function MoveHead() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingTop: 10, paddingBottom: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.lineStrong }}>
      <Txt size={10.5} w={700} color={colors.muted} style={{ flex: 1 }}>
        Date · Particulars
      </Txt>
      {['In', 'Out', 'Bal'].map((l) => (
        <Txt key={l} size={10.5} w={700} color={colors.muted} align="right" style={{ width: l === 'Bal' ? 40 : 34 }}>
          {l}
        </Txt>
      ))}
    </View>
  );
}

function MoveRow({ r, withDateBlock }: { r: MovementRow; withDateBlock?: boolean }) {
  const { day, mon } = dateBlock(r.date);
  return (
    <Tap onPress={() => nav.invoice(r.invoiceId)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: withDateBlock ? 10 : 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      {withDateBlock ? (
        <View style={{ width: 30, alignItems: 'center' }}>
          <Txt display={700} size={15} lh={16}>
            {day}
          </Txt>
          <Txt size={10.5} color={colors.muted}>
            {mon}
          </Txt>
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={withDateBlock ? 13 : 11.5} w={600} numberOfLines={1}>
          {r.title}
        </Txt>
        <Txt size={withDateBlock ? 11 : 10.5} color={colors.muted} numberOfLines={1}>
          {withDateBlock ? `${r.ref} · @ ${fmt(r.rate)}` : `${dateLabel(r.date)} · ${r.ref}`}
        </Txt>
      </View>
      <Txt size={13} w={700} color={colors.sales} tabular align="right" style={{ width: 34 }}>
        {r.qty > 0 ? `+${r.qty}` : ''}
      </Txt>
      <Txt size={13} w={700} color={colors.dangerStrong} tabular align="right" style={{ width: 34 }}>
        {r.qty < 0 ? `−${-r.qty}` : ''}
      </Txt>
      <Txt size={13} w={700} tabular align="right" style={{ width: 40 }}>
        {fmtQty(r.balance)}
      </Txt>
    </Tap>
  );
}
