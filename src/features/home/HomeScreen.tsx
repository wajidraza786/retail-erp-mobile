import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Feedback';
import { HeaderStatusBar } from '@/components/ui/Headers';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, ListRow, SectionTitle } from '@/components/ui/Rows';
import { Pill } from '@/components/ui/StatusPill';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useDashboard, useSettings } from '@/db/hooks';
import { today } from '@/lib/dates';
import { dateLabel, fmt, fmtSigned, initials, plural, weekdayLabel } from '@/lib/format';
import { INVOICE_META, VOUCHER_META, reportTiles, voucherAmount } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { useUi } from '@/store/ui';
import { colors } from '@/theme/tokens';
import type { InvoiceKind, VoucherKind } from '@/db/schema';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { data: d } = useDashboard();
  const { data: settings } = useSettings();
  const setSalesSeg = useUi((s) => s.setSalesSeg);
  const setPurchaseSeg = useUi((s) => s.setPurchaseSeg);
  if (!d || !settings) return <Loading />;

  const t = today();
  const wmax = Math.max(1, ...d.week.map((w) => w.value));
  const actions: { label: string; icon: IconName; bg: string; onPress: () => void }[] = [
    { label: 'New sale', icon: 'sales', bg: colors.sales, onPress: () => nav.newInvoice('SI') },
    { label: 'New purchase', icon: 'cart', bg: colors.purchase, onPress: () => nav.newInvoice('PI') },
    { label: 'Receive cash', icon: 'inArrow', bg: colors.accounts, onPress: () => nav.newVoucher('CRV') },
    { label: 'Pay cash', icon: 'outArrow', bg: colors.report, onPress: () => nav.newVoucher('CPV') },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 24 }}>
      <HeaderStatusBar fg={colors.ink} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.muted}>
            {weekdayLabel(t)}
          </Txt>
          <Txt display={800} size={27} lh={30} ls={-0.5} style={{ marginTop: 2 }} numberOfLines={1}>
            {settings.businessName}
          </Txt>
        </View>
        <Tap onPress={nav.settings} accessibilityLabel="Settings">
          <Badge label={initials(settings.businessName)} bg={colors.ink} fg={colors.white} size={44} round fontSize={14} />
        </Tap>
      </View>

      {/* Today's sales */}
      <Tap
        onPress={() => {
          setSalesSeg('invoices');
          router.navigate('/sales');
        }}
        style={{ marginTop: 14, marginHorizontal: 16, backgroundColor: colors.sales, borderRadius: 28, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt size={14} w={500} color={colors.white}>
            Today&apos;s sales
          </Txt>
          <Pill label={plural(d.todayCount, 'invoice')} bg={'rgba(255,255,255,0.18)'} fg={colors.white} padH={10} padV={4} />
        </View>
        <Txt display={800} size={42} lh={46} ls={-1.2} color={colors.white} tabular style={{ marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
          {fmt(d.todaySales)}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 92, marginTop: 14 }}>
          {d.week.map((w) => {
            const isToday = w.date === t;
            return (
              <View key={w.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                <View style={{ width: '100%', height: Math.max(6, Math.round((w.value / wmax) * 66)), borderRadius: 8, backgroundColor: isToday ? colors.white : colors.onColor35 }} />
                <Txt size={11} w={600} color={colors.white} style={{ opacity: isToday ? 1 : 0.75 }}>
                  {w.weekday}
                </Txt>
              </View>
            );
          })}
        </View>
      </Tap>

      {/* 2×2 tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, marginHorizontal: 16 }}>
        <Tile bg={colors.accounts} label="Cash in hand" value={fmt(d.figures.cash)} sub={`Bank ${fmt(d.figures.bank)}`} onPress={() => nav.report('cashbook')} />
        <Tile bg={colors.report} label="Profit this month" value={fmtSigned(d.figures.monthNet)} sub="After all expenses" onPress={() => nav.report('pl')} />
        <Tile
          label="To receive"
          value={fmt(d.receivable)}
          valueColor={colors.sales}
          sub={`from ${plural(d.owingCustomers, 'customer')}`}
          onPress={() => {
            setSalesSeg('parties');
            router.navigate('/sales');
          }}
        />
        <Tile
          label="To pay"
          value={fmt(d.payable)}
          valueColor={colors.purchase}
          sub={`to ${plural(d.owedSuppliers, 'supplier')}`}
          onPress={() => {
            setPurchaseSeg('parties');
            router.navigate('/purchase');
          }}
        />
      </View>

      <SectionTitle>Quick actions</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        {actions.map((a) => (
          <Tap key={a.label} onPress={a.onPress} style={{ flex: 1, alignItems: 'center', gap: 7 }}>
            <View style={{ width: '100%', aspectRatio: 1, borderRadius: 22, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={26} color={colors.white} />
            </View>
            <Txt size={12} w={600} align="center" lh={14}>
              {a.label}
            </Txt>
          </Tap>
        ))}
      </View>

      {d.low.length > 0 ? (
        <View style={{ marginTop: 24, marginHorizontal: 16, backgroundColor: colors.inventory, borderRadius: 26, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 4, marginBottom: 12 }}>
            <Txt display={700} size={17}>
              Running low
            </Txt>
            <Txt size={13} w={600}>
              {plural(d.low.length, 'item')}
            </Txt>
          </View>
          <View style={{ gap: 6 }}>
            {d.low.slice(0, 4).map((p) => (
              <Tap key={p.id} onPress={() => nav.product(p.id)} style={{ backgroundColor: colors.white, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt size={14} w={600} numberOfLines={1} style={{ flex: 1 }}>
                  {p.name}
                </Txt>
                <Pill label={`${p.stock} left`} bg={colors.reportLight} fg={colors.dangerStrong} padH={9} padV={3} />
              </Tap>
            ))}
          </View>
        </View>
      ) : null}

      <SectionTitle>Reports</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 }}>
        {reportTiles(d.figures).map((r) => (
          <Tap key={r.type} onPress={() => nav.report(r.type)} style={{ width: '48.5%', flexGrow: 1, backgroundColor: colors.white, borderRadius: 20, padding: 14, gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: r.color }} />
            <View>
              <Txt size={14} w={700}>
                {r.title}
              </Txt>
              <Txt size={12} color={colors.muted} tabular style={{ marginTop: 2 }} numberOfLines={1}>
                {r.figure}
              </Txt>
            </View>
          </Tap>
        ))}
      </View>

      <SectionTitle>Recent activity</SectionTitle>
      <Card padded={false} style={{ marginHorizontal: 16 }}>
        {d.recent.length === 0 ? (
          <Txt size={14} color={colors.muted} align="center" style={{ paddingVertical: 24 }}>
            Nothing here yet
          </Txt>
        ) : (
          d.recent.map((r) => {
            const meta = r.type === 'invoice' ? INVOICE_META[r.kind as InvoiceKind] : VOUCHER_META[r.kind as VoucherKind];
            const amt = r.type === 'voucher' ? voucherAmount(r.kind as VoucherKind, r.amount) : { text: fmt(r.amount), color: colors.ink };
            return (
              <ListRow
                key={r.id}
                card={false}
                divider
                badge={r.kind}
                badgeBg={meta.light}
                badgeFg={meta.color}
                badgeSize={40}
                title={r.title}
                sub={`${r.number} · ${dateLabel(r.date)}`}
                right={amt.text}
                rightColor={amt.color}
                onPress={() => (r.type === 'invoice' ? nav.invoice(r.id) : nav.voucher(r.id))}
              />
            );
          })
        )}
      </Card>
    </ScrollView>
  );
}

function Tile({ label, value, sub, bg, valueColor, onPress }: { label: string; value: string; sub: string; bg?: string; valueColor?: string; onPress: () => void }) {
  const fg = bg ? colors.white : colors.ink;
  return (
    <Tap
      onPress={onPress}
      style={{ width: '48%', flexGrow: 1, backgroundColor: bg ?? colors.white, borderRadius: 24, padding: 16, minHeight: bg ? 112 : 100, justifyContent: 'space-between' }}>
      <Txt size={13} w={500} color={bg ? fg : colors.muted}>
        {label}
      </Txt>
      <View>
        <Txt display={800} size={bg ? 22 : 21} color={valueColor ?? fg} tabular numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
        <Txt size={12} color={bg ? fg : colors.muted} style={{ marginTop: 2 }} numberOfLines={1}>
          {sub}
        </Txt>
      </View>
    </Tap>
  );
}
