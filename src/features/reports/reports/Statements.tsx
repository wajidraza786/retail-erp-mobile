import { router } from 'expo-router';
import { View } from 'react-native';

import { KeyValueRow } from '@/components/ui/Rows';
import { Txt } from '@/components/ui/Txt';
import { useBalanceSheet, useProfitLoss } from '@/db/hooks';
import type { BsLine } from '@/db/reports/balanceSheet';
import { monthStart, today } from '@/lib/dates';
import { dateLabelLong, fmt, fmtParen, fmtSigned, rangeLabel } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { useUi } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { balanceSheetReceipt, profitLossReceipt } from '@/features/printing/reportReceipts';

import { ReportLayout } from '../components/ReportLayout';

function Block({ title, children, bg = colors.white }: { title?: string; children: React.ReactNode; bg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 }}>
      {title ? (
        <Txt size={12} w={700} style={{ paddingVertical: 10 }}>
          {title}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

export function ProfitLoss() {
  const range = { from: monthStart(), to: today() };
  const d = useProfitLoss(range).data;
  if (!d) return null;
  const profit = d.net >= 0;
  return (
    <ReportLayout
      title="Profit & Loss"
      period={rangeLabel(range.from, range.to)}
      color={colors.report}
      heroLabel={profit ? 'Net profit' : 'Net loss'}
      hero={fmtSigned(d.net)}
      chip={d.margin !== null ? `Margin ${d.margin}% of sales` : '—'}
      printable={(b) => profitLossReceipt(d, range, b)}>
      <View style={{ gap: 10 }}>
        <Block title="Revenue">
          <KeyValueRow label="Sales" value={fmt(d.sales)} onPress={() => nav.ledger(d.accountIds.sales)} />
          <KeyValueRow label="Less: sales returns" value={fmtParen(d.salesRet)} onPress={() => nav.ledger(d.accountIds.salesRet)} />
          <KeyValueRow label="Net sales" value={fmt(d.netSales)} bold />
          <KeyValueRow label="Cost of goods sold" value={fmtParen(-d.cogs)} onPress={() => nav.ledger(d.accountIds.cogs)} />
          <KeyValueRow label="Gross profit" value={fmtSigned(d.gross)} bold big={16} />
        </Block>
        <Block title="Expenses">
          {d.expenses.map((e) => (
            <KeyValueRow key={e.account.id} label={e.account.name} value={fmt(e.amount)} onPress={() => nav.ledger(e.account.id)} />
          ))}
          <KeyValueRow label="Total expenses" value={fmt(d.totalExpenses)} bold />
        </Block>
        <Block bg={profit ? colors.sales : colors.report}>
          <KeyValueRow dark first label="Gross profit" value={fmtSigned(d.gross)} />
          <KeyValueRow dark label="Other income" value={fmt(d.otherIncome)} onPress={() => nav.ledger(d.accountIds.otherIncome)} />
          <KeyValueRow dark label="Less: expenses" value={fmtParen(-d.totalExpenses)} />
          <KeyValueRow dark label={profit ? 'Net profit' : 'Net loss'} value={fmtSigned(d.net)} bold big={18} />
        </Block>
      </View>
    </ReportLayout>
  );
}

export function BalanceSheet() {
  const asOf = today();
  const d = useBalanceSheet(asOf).data;
  const setSalesSeg = useUi((s) => s.setSalesSeg);
  const setPurchaseSeg = useUi((s) => s.setPurchaseSeg);
  const setInventorySeg = useUi((s) => s.setInventorySeg);
  if (!d) return null;

  const open = (l: BsLine) => {
    if (l.accountId) return nav.ledger(l.accountId);
    if (l.link === 'customers') {
      setSalesSeg('parties');
      router.navigate('/sales');
    } else if (l.link === 'suppliers') {
      setPurchaseSeg('parties');
      router.navigate('/purchase');
    } else if (l.link === 'stock') {
      setInventorySeg('products');
      router.navigate('/inventory');
    } else if (l.link === 'pl') nav.report('pl');
  };
  const lines = (ls: BsLine[]) => ls.map((l) => <KeyValueRow key={l.label} label={l.label} value={l.amount < 0 ? fmtParen(l.amount) : fmt(l.amount)} onPress={() => open(l)} />);

  return (
    <ReportLayout
      title="Balance Sheet"
      period={`As of ${dateLabelLong(asOf)}`}
      color={colors.purchase}
      heroLabel="Total assets"
      hero={fmt(d.totalAssets)}
      chip={d.difference === 0 ? 'Balanced: assets = liabilities + equity' : `Out of balance by ${fmt(d.difference)}`}
      printable={(b) => balanceSheetReceipt(d, asOf, b)}>
      <View style={{ gap: 10 }}>
        <Block title="What you own">
          {lines(d.assets)}
          <KeyValueRow label="Total assets" value={fmt(d.totalAssets)} bold big={16} />
        </Block>
        <Block title="What you owe">
          {lines(d.liabilities)}
          <KeyValueRow label="Total liabilities" value={fmt(d.totalLiabilities)} bold />
        </Block>
        <Block title="Owner's equity">
          {lines(d.equity)}
          <KeyValueRow label="Total equity" value={fmtSigned(d.totalEquity)} bold />
        </Block>
        <Block bg={colors.purchase}>
          <KeyValueRow dark first label="Liabilities + equity" value={fmt(d.totalLiabilities + d.totalEquity)} bold big={16} />
        </Block>
      </View>
    </ReportLayout>
  );
}
