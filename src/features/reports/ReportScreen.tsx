import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/Feedback';
import { isReportType } from '@/features/shared/meta';

import { CashBook } from './reports/CashBook';
import { GeneralLedger } from './reports/GeneralLedger';
import { BalanceSheet, ProfitLoss } from './reports/Statements';
import { StockLedger } from './reports/StockLedger';
import { StockSummary } from './reports/StockSummary';
import { TradeReport } from './reports/TradeReport';
import { TrialBalance } from './reports/TrialBalance';

/** `/report/[type]` → the matching report. */
export function ReportScreen() {
  const { type, productId } = useLocalSearchParams<{ type: string; productId?: string }>();
  if (!isReportType(type)) return <EmptyState text="Unknown report" />;
  switch (type) {
    case 'cashbook':
      return <CashBook />;
    case 'pl':
      return <ProfitLoss />;
    case 'bs':
      return <BalanceSheet />;
    case 'tb':
      return <TrialBalance />;
    case 'gl':
      return <GeneralLedger />;
    case 'sales':
      return <TradeReport side="sales" />;
    case 'purchase':
      return <TradeReport side="purchase" />;
    case 'stock':
      return <StockSummary />;
    case 'stockledger':
      return <StockLedger initialProductId={productId} />;
  }
}
