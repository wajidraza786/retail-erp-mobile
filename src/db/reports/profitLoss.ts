import { db, type Executor } from '../client';
import { balanceBook, profitFigures, type Range } from '../queries/balances';

/** Revenue, COGS, gross profit, expenses and net profit for a period. */
export function profitLoss(range: Range, ex: Executor = db) {
  const b = balanceBook({ from: range.from, to: range.to }, ex);
  const f = profitFigures(b);
  return {
    ...f,
    accountIds: {
      sales: b.key('sales').id,
      salesRet: b.key('salesret').id,
      cogs: b.key('cogs').id,
      otherIncome: b.key('otherinc').id,
    },
    expenses: f.expenses.filter((e) => e.amount !== 0),
    margin: f.netSales ? Math.round((f.net / f.netSales) * 100) : null,
  };
}
