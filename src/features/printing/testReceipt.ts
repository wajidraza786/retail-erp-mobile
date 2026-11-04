import { today } from '@/lib/dates';
import { dateLabelLong } from '@/lib/format';

import { receiptFooter, receiptHeader } from './documentReceipts';
import { PAPER, type PaperWidth, type Receipt } from './receipt';

/** Test page: checks width (ruler), bold, sizes, columns and the footer. */
export function testReceipt(businessName: string, footer: string, paper: PaperWidth): Receipt {
  const chars = PAPER[paper].chars;
  const ruler = Array.from({ length: chars }, (_, i) => String((i + 1) % 10)).join('');
  return {
    fileName: 'Printer-test',
    title: 'Printer test',
    columns: { widths: [50, 20, 30], align: ['left', 'right', 'right'] },
    lines: [
      ...receiptHeader(businessName || 'Your shop', 'Printer test', [
        ['Paper', `${paper} mm · ${chars} characters`],
        ['Date', dateLabelLong(today())],
      ]),
      { t: 'text', text: 'Every line below should fit on one row. On a Bluetooth printer the number ruler should end exactly at the right edge.' },
      { t: 'row', cells: [ruler] },
      { t: 'hr' },
      { t: 'item', name: 'Anker 20W USB-C Charger', detail: '2 x Rs 3,200', amount: 'Rs 6,400' },
      { t: 'row', cells: ['Item', 'Qty', 'Amount'], bold: true },
      { t: 'row', cells: ['Type-C Cable', '10', 'Rs 10,000'] },
      { t: 'kv', label: 'TOTAL', value: 'Rs 16,400', big: true },
      ...receiptFooter(footer),
    ],
  };
}
