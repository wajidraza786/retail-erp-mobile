/**
 * Read hooks used by screens. Each wraps a synchronous query function from
 * `db/queries` or `db/reports` in TanStack Query, so data refreshes after every write.
 */
import { useQuery, type QueryKey } from '@tanstack/react-query';

import { today } from '@/lib/dates';

import { getAccountTree, getLedger } from '../queries/accounts';
import type { Range } from '../queries/balances';
import { getCashAndBank, getDashboard, getReportFigures, getTradeStats } from '../queries/dashboard';
import { getInvoice, getVoucher, listInvoices, listVouchers } from '../queries/documents';
import { listParties } from '../queries/parties';
import { getProduct, listBrands, listCategories, listGroups, listProducts } from '../queries/products';
import { balanceSheet } from '../reports/balanceSheet';
import { cashBook } from '../reports/cashBook';
import { generalLedger } from '../reports/generalLedger';
import { profitLoss } from '../reports/profitLoss';
import { salesPurchaseReport, type TradeSide } from '../reports/salesPurchase';
import { stockLedger, stockLedgerAll } from '../reports/stockLedger';
import { stockSummary } from '../reports/stockSummary';
import { trialBalance } from '../reports/trialBalance';
import type { AccountType, InvoiceKind, VoucherKind } from '../schema';
import type { PartyType } from '../services/accounts';
import { peekNextNumber, type DocKind } from '../services/numbering';
import { getSettings } from '../services/settings';
import { db } from '../client';

function useDb<T>(key: QueryKey, fn: () => T, enabled = true) {
  return useQuery({ queryKey: key, queryFn: async () => fn(), enabled });
}

export const useSettings = () => useDb(['settings'], () => getSettings());
export const useDashboard = () => {
  const d = today();
  return useDb(['dashboard', d], () => getDashboard(d));
};
export const useReportFigures = () => {
  const d = today();
  return useDb(['reportFigures', d], () => getReportFigures(d));
};
export const useTradeStats = (side: 'sales' | 'purchase') => {
  const d = today();
  return useDb(['tradeStats', side, d], () => getTradeStats(side, d));
};
export const useCashAndBank = () => useDb(['cashBank'], () => getCashAndBank());

export const useParties = (type: PartyType, search = '') => useDb(['parties', type, search], () => listParties(type, search));
export const useInvoices = (kinds: InvoiceKind[], search = '') => useDb(['invoices', kinds, search], () => listInvoices({ kinds, search }));
export const useInvoice = (id: string | undefined) => useDb(['invoice', id], () => (id ? getInvoice(id) : null), !!id);
export const useVouchers = (kind: VoucherKind | 'all') => useDb(['vouchers', kind], () => listVouchers({ kind }));
export const useVoucher = (id: string | undefined) => useDb(['voucher', id], () => (id ? getVoucher(id) : null), !!id);
export const useNextNumber = (kind: DocKind) => useDb(['nextNumber', kind], () => peekNextNumber(db, kind));

export const useProducts = (opts: { categoryId?: string | null; search?: string } = {}) =>
  useDb(['products', opts.categoryId ?? 'all', opts.search ?? ''], () => listProducts(opts));
export const useProduct = (id: string | undefined) => useDb(['product', id], () => (id ? getProduct(id) : null), !!id);
export const useCategories = () => useDb(['categories'], () => listCategories());
export const useBrands = () => useDb(['brands'], () => listBrands());
export const useGroups = (kind: 'category' | 'brand', search = '') => useDb(['groups', kind, search], () => listGroups(kind, search));

export const useAccountTree = () => useDb(['coa'], () => getAccountTree());
export const useLedger = (accountId: string | undefined) => useDb(['ledger', accountId], () => (accountId ? getLedger(accountId) : null), !!accountId);

export const useCashBook = (range: Range) => useDb(['report', 'cashbook', range], () => cashBook(range));
export const useProfitLoss = (range: Range) => useDb(['report', 'pl', range], () => profitLoss(range));
export const useBalanceSheet = (asOf: string) => useDb(['report', 'bs', asOf], () => balanceSheet(asOf));
export const useTrialBalance = (asOf: string) => useDb(['report', 'tb', asOf], () => trialBalance(asOf));
export const useGeneralLedger = (type: AccountType | 'all', search: string) =>
  useDb(['report', 'gl', type, search], () => generalLedger({ type, search }));
export const useTradeReport = (side: TradeSide, range: Range, search: string) =>
  useDb(['report', side, range, search], () => salesPurchaseReport({ side, range, search }));
export const useStockSummary = (range: Range, categoryId: string | null, search: string) =>
  useDb(['report', 'stock', range, categoryId, search], () => stockSummary({ range, categoryId, search }));
export const useStockLedger = (productId: string | undefined, range: Range, search: string) =>
  useDb(['report', 'stockledger', productId, range, search], () => (productId ? stockLedger({ productId, range, search }) : null), !!productId);
export const useStockLedgerAll = (range: Range, search: string, enabled: boolean) =>
  useDb(['report', 'stockledgerAll', range, search], () => stockLedgerAll({ range, search }), enabled);
