import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Fab } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/Feedback';
import { FilterChips } from '@/components/ui/FilterChips';
import { HeaderStats, ModuleHeader } from '@/components/ui/Headers';
import { ListRow } from '@/components/ui/Rows';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useAccountTree, useReportFigures, useVouchers } from '@/db/hooks';
import type { VoucherKind } from '@/db/schema';
import { today } from '@/lib/dates';
import { dateLabel, monthLabel, fmt } from '@/lib/format';
import { CoaTree } from '@/features/accounts/CoaTree';
import { VOUCHER_META, reportTiles, voucherAmount } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { VoucherTypeChooser } from '@/features/vouchers/VoucherTypeChooser';
import { useUi, type AccountsSeg } from '@/store/ui';
import { colors } from '@/theme/tokens';

export function AccountsScreen() {
  const seg = useUi((s) => s.accountsSeg);
  const setSeg = useUi((s) => s.setAccountsSeg);
  const [filter, setFilter] = useState<VoucherKind | 'all'>('all');
  const [chooser, setChooser] = useState(false);

  const figures = useReportFigures().data;
  const vouchers = useVouchers(filter).data ?? [];
  const tree = useAccountTree().data ?? [];
  const bank = tree.flatMap((n) => [n, ...n.children.flatMap((c) => [c, ...c.children])]).find((n) => n.account.systemKey === 'bank');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: seg === 'vouchers' ? 100 : 40 }}>
        <ModuleHeader title="Accounts" right={monthLabel(today())} color={colors.accounts}>
          <HeaderStats
            items={[
              { label: 'Cash in hand', value: fmt(figures?.cash ?? 0) },
              { label: bank?.account.name ?? 'Bank', value: fmt(figures?.bank ?? 0) },
            ]}
          />
          <View style={{ marginTop: 14 }}>
            <SegmentedControl<AccountsSeg>
              value={seg}
              onChange={setSeg}
              activeColor={colors.accounts}
              options={[
                { value: 'vouchers', label: 'Vouchers' },
                { value: 'accounts', label: 'Accounts' },
                { value: 'reports', label: 'Reports' },
              ]}
            />
          </View>
        </ModuleHeader>

        {seg === 'vouchers' ? (
          <>
            <FilterChips<VoucherKind | 'all'>
              chips={[
                { value: 'all', label: 'All' },
                { value: 'CRV', label: 'Receipts' },
                { value: 'CPV', label: 'Payments' },
                { value: 'JV', label: 'Journals' },
              ]}
              value={filter}
              onChange={setFilter}
              style={{ paddingTop: 14, paddingBottom: 10 }}
            />
            <View style={{ gap: 8, paddingHorizontal: 16 }}>
              {vouchers.length === 0 ? <EmptyState text="Nothing here yet" /> : null}
              {vouchers.map((v) => {
                const amt = voucherAmount(v.kind, v.amount);
                return (
                  <ListRow
                    key={v.id}
                    badge={v.kind}
                    badgeBg={VOUCHER_META[v.kind].light}
                    badgeFg={VOUCHER_META[v.kind].color}
                    title={v.narration}
                    sub={`${v.number} · ${dateLabel(v.date)} · ${v.accountsLabel}`}
                    right={amt.text}
                    rightColor={amt.color}
                    onPress={() => nav.voucher(v.id)}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        {seg === 'accounts' ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Txt size={13} color={colors.muted} style={{ marginTop: 14, marginBottom: 8, paddingHorizontal: 4 }}>
              Tap a group to open it, tap an account to see its ledger.
            </Txt>
            <CoaTree nodes={tree} />
          </View>
        ) : null}

        {seg === 'reports' ? (
          <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 14 }}>
            {reportTiles(figures).map((r) => (
              <Tap
                key={r.type}
                onPress={() => nav.report(r.type)}
                style={{ backgroundColor: r.color, borderRadius: 24, padding: 18, minHeight: 112, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt display={800} size={22} ls={-0.4} color={colors.white}>
                    {r.title}
                  </Txt>
                  <Txt size={13} lh={17.5} color={colors.white} style={{ marginTop: 4, maxWidth: 200 }}>
                    {r.desc}
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt size={11} w={500} color={colors.white}>
                    {r.figureLabel}
                  </Txt>
                  <Txt display={700} size={17} color={colors.white} tabular numberOfLines={1}>
                    {r.figure}
                  </Txt>
                </View>
              </Tap>
            ))}
          </View>
        ) : null}
      </ScrollView>
      {seg === 'vouchers' ? <Fab label="New voucher" onPress={() => setChooser(true)} /> : null}
      <VoucherTypeChooser visible={chooser} onClose={() => setChooser(false)} />
    </View>
  );
}
