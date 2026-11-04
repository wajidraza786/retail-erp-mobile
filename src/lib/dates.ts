import { addDays as dfAddDays, format, parseISO, startOfMonth } from 'date-fns';

/** Business dates are ISO `YYYY-MM-DD` strings in local time. */
export type ISODate = string;

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd');
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function parseDate(s: ISODate): Date {
  return parseISO(s);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISODate(dfAddDays(parseISO(s), n));
}

export function monthStart(s: ISODate = today()): ISODate {
  return toISODate(startOfMonth(parseISO(s)));
}

export function nowTimestamp(): string {
  return new Date().toISOString();
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}
