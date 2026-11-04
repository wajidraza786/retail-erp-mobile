import { toWhatsAppNumber } from '@/lib/phone';

import { receiptEscPos, toAscii, toBase64 } from '../escpos';
import { PAPER, receiptHeight, receiptHtml, receiptText, receiptTextLines, type PaperWidth, type Receipt } from '../receipt';

const sample: Receipt = {
  fileName: 'SI-1050',
  title: 'Sale Invoice SI-1050',
  columns: { widths: [50, 20, 30], align: ['left', 'right', 'right'] },
  lines: [
    { t: 'center', text: 'Raza Mobile Hub', size: 'xl' },
    { t: 'center', text: 'Sale Invoice', size: 'lg' },
    { t: 'hr', style: 'solid' },
    { t: 'kv', label: 'Customer', value: 'Bilal Electronics With A Very Long Trading Name' },
    { t: 'item', name: 'Samsung 25W Super Fast Charger (Black, EU plug)', detail: '12 × Rs 4,200', amount: 'Rs 50,400' },
    { t: 'row', cells: ['Product name that is far too long', '1,000', 'Rs 1,234,567'], bold: true },
    { t: 'kv', label: 'TOTAL', value: 'Rs 1,234,567', big: true },
    { t: 'text', text: 'A long note that has to wrap across several lines on narrow 58 millimetre paper without overflowing.' },
    { t: 'section', text: 'Expenses' },
    { t: 'gap' },
  ],
};

describe.each([58, 80] as PaperWidth[])('%i mm receipts', (paper) => {
  const w = PAPER[paper].chars;

  it('never exceeds the line width', () => {
    receiptTextLines(sample, w).forEach((l) => {
      const limit = l.size === 'big' ? Math.floor(w / 2) : w;
      expect(l.text.length).toBeLessThanOrEqual(limit);
    });
  });

  it('keeps a space between table columns', () => {
    const row = receiptTextLines(sample, w).find((l) => l.text.includes('1,000'))!;
    expect(row.text).toMatch(/\s1,000\s+Rs 1,234,567$/);
  });

  it('sizes the HTML page to the roll', () => {
    const html = receiptHtml(sample, paper);
    expect(html).toContain(`size: ${PAPER[paper].px}pt ${receiptHeight(sample, paper)}pt`);
  });

  it('encodes ASCII-only ESC/POS with init, cut and feed', () => {
    const bytes = receiptEscPos(sample, { paper, cut: true });
    expect([...bytes.slice(0, 2)]).toEqual([0x1b, 0x40]);
    expect([...bytes.slice(-4)]).toEqual([0x1d, 0x56, 0x42, 0x00]);
    expect([...bytes].every((b) => b < 0x80)).toBe(true);
  });
});

it('omits the cut command when disabled', () => {
  const bytes = receiptEscPos(sample, { paper: 58, cut: false });
  expect([...bytes.slice(-3)]).toEqual([0x1b, 0x64, 4]);
});

it('maps typography to ASCII for the printer', () => {
  expect(toAscii('12 × Rs 4,200 − 5 … ok')).toBe('12 x Rs 4,200 - 5 . ok');
});

it('base64-encodes (RFC 4648 test vectors)', () => {
  const vectors: [string, string][] = [['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'], ['foob', 'Zm9vYg=='], ['fooba', 'Zm9vYmE='], ['foobar', 'Zm9vYmFy']];
  vectors.forEach(([raw, b64]) => expect(toBase64(Uint8Array.from(raw, (c) => c.charCodeAt(0)))).toBe(b64));
  expect(toBase64(Uint8Array.from([0x1b, 0x40, 0xff]))).toBe('G0D/');
});

it('wraps WhatsApp text in a monospace block', () => {
  const text = receiptText(sample);
  expect(text.startsWith('```\n')).toBe(true);
  expect(text.endsWith('\n```')).toBe(true);
  expect(text).toContain('RAZA MOBILE HUB');
});

it('converts Pakistani numbers for WhatsApp', () => {
  expect(toWhatsAppNumber('0300 4412870')).toBe('923004412870');
  expect(toWhatsAppNumber('+92 321 7781203')).toBe('923217781203');
  expect(toWhatsAppNumber('0092 300 1234567')).toBe('923001234567');
  expect(toWhatsAppNumber('Cash counter')).toBeNull();
  expect(toWhatsAppNumber(null)).toBeNull();
});
