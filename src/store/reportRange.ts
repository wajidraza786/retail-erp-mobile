import { create } from 'zustand';

import { monthStart, today, type ISODate } from '@/lib/dates';

/**
 * Date range shared by Sales, Purchase, Stock Summary and Stock Ledger reports.
 * Default: first of the current month → today. From > To is swapped.
 */
type ReportRangeState = {
  from: ISODate;
  to: ISODate;
  setFrom: (d: ISODate) => void;
  setTo: (d: ISODate) => void;
  setRange: (from: ISODate, to: ISODate) => void;
};

const ordered = (a: ISODate, b: ISODate) => (a <= b ? { from: a, to: b } : { from: b, to: a });

export const useReportRange = create<ReportRangeState>((set, get) => ({
  from: monthStart(),
  to: today(),
  setFrom: (d) => set(ordered(d, get().to)),
  setTo: (d) => set(ordered(get().from, d)),
  setRange: (from, to) => set(ordered(from, to)),
}));
