import { dateLabel, fmt, fmtParen, fmtSigned, initials, rangeLabel } from '../format';
import { paisaToInput, toPaisa, toQty } from '../money';

describe('money', () => {
  it('parses rupee input into integer paisa', () => {
    expect(toPaisa('12,399')).toBe(1_239_900);
    expect(toPaisa('0.1')).toBe(10);
    expect(toPaisa('abc')).toBe(0);
    expect(toPaisa('')).toBe(0);
  });
  it('round-trips into input strings', () => {
    expect(paisaToInput(1_239_900)).toBe('12399');
    expect(paisaToInput(0)).toBe('');
  });
  it('parses quantities', () => {
    expect(toQty('3')).toBe(3);
    expect(toQty('-1')).toBe(0);
  });
});

describe('format', () => {
  it('formats rupees like the prototype', () => {
    expect(fmt(1_239_900)).toBe('Rs 12,399');
    expect(fmtSigned(-379_900)).toBe('−Rs 3,799');
    expect(fmtParen(-379_900)).toBe('(Rs 3,799)');
    expect(fmtParen(379_900)).toBe('Rs 3,799');
  });
  it('formats dates and initials', () => {
    expect(dateLabel('2026-10-14')).toBe('14 Oct');
    expect(rangeLabel('2026-10-01', '2026-10-14')).toBe('1 – 14 October 2026');
    expect(initials('Bilal Electronics')).toBe('BE');
    expect(initials('Walk-in Customer')).toBe('WC');
    expect(initials('')).toBe('?');
  });
});
