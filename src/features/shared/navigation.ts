import { router } from 'expo-router';

import type { InvoiceKind, PostingSource, VoucherKind } from '@/db/schema';

import type { ReportType } from './meta';

/** Typed navigation helpers so screens never build route strings by hand. */
export const nav = {
  newInvoice: (kind: InvoiceKind, opts: { partyId?: string; sourceInvoiceId?: string } = {}) =>
    router.push({ pathname: '/invoice/new', params: { kind, ...opts } }),
  invoice: (id: string, opts: { replace?: boolean } = {}) =>
    opts.replace ? router.replace({ pathname: '/invoice/[id]', params: { id } }) : router.push({ pathname: '/invoice/[id]', params: { id } }),
  newVoucher: (kind: VoucherKind, opts: { accountId?: string; amount?: string } = {}) =>
    router.push({ pathname: '/voucher/new', params: { kind, ...opts } }),
  voucher: (id: string, opts: { replace?: boolean } = {}) =>
    opts.replace ? router.replace({ pathname: '/voucher/[id]', params: { id } }) : router.push({ pathname: '/voucher/[id]', params: { id } }),
  ledger: (accountId: string) => router.push({ pathname: '/ledger/[accountId]', params: { accountId } }),
  product: (id?: string) => router.push({ pathname: '/product', params: id ? { id } : {} }),
  report: (type: ReportType, opts: { productId?: string } = {}) => router.push({ pathname: '/report/[type]', params: { type, ...opts } }),
  settings: () => router.push('/settings'),
  /** Open the document behind a posting (ledger and report drill-downs). */
  source: (sourceType: PostingSource, sourceId: string | null) => {
    if (!sourceId) return;
    if (sourceType === 'invoice') nav.invoice(sourceId);
    else if (sourceType === 'voucher') nav.voucher(sourceId);
  },
};
