/**
 * Thermal receipt layout for 58 mm and 80 mm roll paper.
 *
 * A receipt is a list of simple lines. The same lines render to:
 * - ESC/POS bytes for Bluetooth thermal printers (see escpos.ts),
 * - HTML sized to the paper width (system print / saved PDF),
 * - monospaced text for WhatsApp messages.
 *
 * Every HTML line has a fixed height, so the page height is known exactly and the
 * printer does not feed blank paper after the last line.
 */

export type Align = 'left' | 'right';
export type PaperWidth = 58 | 80;

export type ReceiptLine =
  /** Centred text. `xl` is the business name, `lg` the document title. */
  | { t: 'center'; text: string; size?: 'sm' | 'md' | 'lg' | 'xl'; bold?: boolean }
  /** Label on the left, value on the right. */
  | { t: 'kv'; label: string; value: string; bold?: boolean; big?: boolean }
  /** Two-line item: name, then "2 × Rs 3,200" with the amount on the right. */
  | { t: 'item'; name: string; detail: string; amount: string }
  /** Table row using the receipt's `columns`. */
  | { t: 'row'; cells: string[]; bold?: boolean }
  | { t: 'hr'; style?: 'dashed' | 'solid' | 'double' }
  /** Wrapping paragraph. */
  | { t: 'text'; text: string; muted?: boolean }
  /** Bold section heading. */
  | { t: 'section'; text: string }
  | { t: 'gap' };

export type Receipt = {
  /** Used for the PDF file name, without extension. */
  fileName: string;
  /** Shown in share dialogs. */
  title: string;
  lines: ReceiptLine[];
  /** Table layout for `row` lines: width in % and alignment per column. */
  columns?: { widths: number[]; align: Align[] };
};

/** Paper geometry. Characters per line match ESC/POS Font A (12×24 dots). */
export const PAPER: Record<PaperWidth, { px: number; padX: number; chars: number; textChars: number; font: number }> = {
  58: { px: 164, padX: 5, chars: 32, textChars: 32, font: 7.5 },
  80: { px: 227, padX: 8, chars: 48, textChars: 44, font: 8.5 },
};

// ─── styled text lines (shared by WhatsApp and ESC/POS) ────────────────────────
export type TextLine = { text: string; align?: 'left' | 'center'; bold?: boolean; size?: 'normal' | 'tall' | 'big' };

const fit = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(0, n - 1)) + '…' : s);
const padL = (s: string, n: number) => fit(s, n).padStart(n);
const padR = (s: string, n: number) => fit(s, n).padEnd(n);

function wrapWords(s: string, w: number): string[] {
  const out: string[] = [];
  let line = '';
  s.split(/\s+/).forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > w && line) {
      out.push(line);
      line = word;
    } else line = next;
  });
  if (line) out.push(line);
  return out.map((l) => fit(l, w));
}

/**
 * Column widths (in characters) for the receipt's table, sized once so rows line up.
 * Numeric (right-aligned) columns grow to fit their widest value and short text
 * columns (dates, numbers) keep their content; the widest text column takes what is
 * left. If that leaves fewer than 12 characters, rows are `stacked` onto two lines.
 */
export function tableLayout(r: Receipt, w: number) {
  const rows = r.lines.filter((l): l is Extract<ReceiptLine, { t: 'row' }> => l.t === 'row');
  const nCols = Math.max(0, ...rows.map((l) => l.cells.length));
  const isRight = (i: number) => (r.columns?.align[i] ?? (i ? 'right' : 'left')) === 'right';
  const pct = r.columns?.widths ?? Array.from({ length: nCols }, () => 100 / Math.max(1, nCols));
  const maxLen = (i: number) => Math.max(0, ...rows.map((l) => (l.cells[i] ?? '').length));
  const lefts = pct.map((_, i) => i).filter((i) => !isRight(i));
  const flex = lefts.reduce((best, i) => (pct[i] > pct[best] ? i : best), lefts[0] ?? 0);
  const widths = pct.map((p, i) => {
    if (i === flex) return 0;
    if (isRight(i)) return Math.max(Math.floor((p / 100) * w), maxLen(i) + 1);
    return Math.max(3, Math.min(maxLen(i) + 1, Math.floor((p / 100) * w) + 4));
  });
  widths[flex] = w - widths.reduce((a, b) => a + b, 0);
  const stacked = rows.length > 0 && nCols > 1 && widths[flex] < 12;
  return { widths, isRight, stacked };
}

/**
 * Lays the receipt out as fixed-width text lines, `w` characters wide.
 * `big` lines are printed double width, so they get half the characters.
 */
export function receiptTextLines(r: Receipt, w: number): TextLine[] {
  /** Label left, value right, never wider than `w`. The label keeps up to 40% of the line. */
  const spread = (l: string, rgt: string) => {
    const labelMin = Math.min(l.length, Math.floor(w * 0.4));
    const right = fit(rgt, Math.max(1, w - labelMin - 1));
    return padR(l, w - right.length - 1) + ' ' + right;
  };

  const table = tableLayout(r, w);

  const out: TextLine[] = [];
  r.lines.forEach((l) => {
    switch (l.t) {
      case 'center':
        if (l.size === 'xl') out.push({ text: fit(l.text, Math.floor(w / 2)), align: 'center', bold: true, size: 'big' });
        else if (l.size === 'lg') out.push({ text: fit(l.text, w), align: 'center', bold: true, size: 'tall' });
        else out.push({ text: fit(l.text, w), align: 'center', bold: l.bold });
        break;
      case 'kv':
        out.push({ text: spread(l.label, l.value), bold: l.bold || l.big, size: l.big ? 'tall' : 'normal' });
        break;
      case 'item':
        out.push({ text: fit(l.name, w), bold: true }, { text: spread('  ' + l.detail, l.amount) });
        break;
      case 'row': {
        const { widths, isRight, stacked } = table;
        if (stacked) {
          // Narrow paper: text cells on one line, numbers right-aligned below.
          const text = l.cells.filter((_, i) => !isRight(i)).filter(Boolean).join(' ');
          const nums = l.cells.map((c, i) => (isRight(i) ? padL(c, widths[i]) : '')).filter((c) => c.trim()).join(' ');
          out.push({ text: fit(text, w), bold: l.bold });
          if (nums.trim()) out.push({ text: padL(nums, w), bold: l.bold });
          break;
        }
        // One space separates neighbouring columns: right-aligned cells lead with it,
        // left-aligned cells trail it.
        const last = l.cells.length - 1;
        const cells = l.cells.map((c, i) => {
          const width = widths[i] ?? 3;
          if (isRight(i)) return i ? ' ' + padL(c, width - 1) : padL(c, width);
          return i === last ? padR(c, width) : padR(c, width - 1) + ' ';
        });
        out.push({ text: cells.join(''), bold: l.bold });
        break;
      }
      case 'hr':
        out.push({ text: (l.style === 'double' ? '=' : '-').repeat(w) });
        break;
      case 'text':
        wrapWords(l.text, w).forEach((t) => out.push({ text: t }));
        break;
      case 'section':
        out.push({ text: fit(l.text.toUpperCase(), w), bold: true });
        break;
      case 'gap':
        out.push({ text: '' });
        break;
    }
  });
  return out.map((t) => ({ ...t, text: t.text.replace(/\s+$/, '') }));
}

/** Monospace text for WhatsApp (32 columns fits a phone), wrapped in a ``` block. */
export function receiptText(r: Receipt, w = 32): string {
  const lines = receiptTextLines(r, w).map((l) => {
    const width = l.size === 'big' ? Math.floor(w / 2) : w;
    const text = l.size === 'big' ? l.text.toUpperCase() : l.text;
    return l.align === 'center' ? ' '.repeat(Math.max(0, Math.floor((width - text.length) / 2))) + text : text;
  });
  return '```\n' + lines.join('\n') + '\n```';
}

// ─── HTML / PDF ────────────────────────────────────────────────────────────────
// expo-print page sizes are in points (1/72 in). CSS uses `pt` too, so the content
// fills the roll exactly on both Android (Chromium) and iOS (WebKit).
const PAD_Y = 10;
const H = { center: { sm: 11, md: 13, lg: 16, xl: 19 }, kv: 12, kvBig: 16, item: 24, row: 12, hr: 7, textLine: 11, section: 15, gap: 6 } as const;

function lineHeight(l: ReceiptLine, paper: PaperWidth, stacked = false): number {
  switch (l.t) {
    case 'center':
      return H.center[l.size ?? 'md'];
    case 'kv':
      return l.big ? H.kvBig : H.kv;
    case 'item':
      return H.item;
    case 'row':
      return stacked ? H.row * 2 : H.row;
    case 'hr':
      return H.hr;
    case 'text':
      return Math.max(1, Math.ceil(l.text.length / PAPER[paper].textChars)) * H.textLine;
    case 'section':
      return H.section;
    case 'gap':
      return H.gap;
  }
}

/** Exact page height in points for the receipt on the given paper. */
export function receiptHeight(r: Receipt, paper: PaperWidth): number {
  const { stacked } = tableLayout(r, PAPER[paper].chars);
  return Math.ceil(PAD_Y * 2 + r.lines.reduce((s, l) => s + lineHeight(l, paper, stacked), 0));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function lineHtml(l: ReceiptLine, r: Receipt, paper: PaperWidth, stacked: boolean): string {
  const h = lineHeight(l, paper, stacked);
  const box = (cls: string, inner: string) => `<div class="${cls}" style="height:${h}pt;line-height:${h}pt">${inner}</div>`;
  switch (l.t) {
    case 'center':
      return box(`c ${l.size ?? 'md'}${l.bold ? ' b' : ''}`, esc(l.text));
    case 'kv':
      return box(`kv${l.bold ? ' b' : ''}${l.big ? ' big' : ''}`, `<span class="l">${esc(l.label)}</span><span class="r">${esc(l.value)}</span>`);
    case 'item':
      return `<div class="item" style="height:${h}pt"><div class="n">${esc(l.name)}</div><div class="kv"><span class="l m">${esc(l.detail)}</span><span class="r b">${esc(l.amount)}</span></div></div>`;
    case 'row': {
      const widths = r.columns?.widths ?? l.cells.map(() => 100 / l.cells.length);
      const align = r.columns?.align ?? l.cells.map((_, i) => (i ? 'right' : 'left'));
      if (stacked) {
        const text = l.cells.filter((_, i) => align[i] !== 'right').filter(Boolean).join(' ');
        const nums = l.cells.filter((c, i) => align[i] === 'right' && c).map((c) => `<span>${esc(c)}</span>`).join(' ');
        return `<div class="${l.bold ? 'b' : ''}" style="height:${h}pt"><div style="height:${H.row}pt;line-height:${H.row}pt">${esc(text)}</div><div class="nums" style="height:${H.row}pt;line-height:${H.row}pt">${nums}</div></div>`;
      }
      const cells = l.cells.map((c, i) => `<span style="width:${widths[i]}%;text-align:${align[i] ?? 'left'}">${esc(c)}</span>`).join('');
      return box(`row${l.bold ? ' b' : ''}`, cells);
    }
    case 'hr':
      return `<div style="height:${h}pt;display:flex;align-items:center"><div class="hr ${l.style ?? 'dashed'}"></div></div>`;
    case 'text':
      return `<div class="t${l.muted ? ' m' : ''}" style="height:${h}pt;line-height:${H.textLine}pt">${esc(l.text)}</div>`;
    case 'section':
      return box('sec b', esc(l.text));
    case 'gap':
      return `<div style="height:${h}pt"></div>`;
  }
}

export function receiptHtml(r: Receipt, paper: PaperWidth): string {
  const { px, padX, font, chars } = PAPER[paper];
  const height = receiptHeight(r, paper);
  const { stacked } = tableLayout(r, chars);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page { size: ${px}pt ${height}pt; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${px}pt; height: ${height}pt; }
body { padding: ${PAD_Y}pt ${padX}pt; font-family: Helvetica, Arial, sans-serif; font-size: ${font}pt; color: #000; }
div { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.b { font-weight: 700; } .m { color: #444; }
.c { text-align: center; } .sm { font-size: ${font - 1}pt; } .lg { font-size: ${font + 2.5}pt; font-weight: 700; } .xl { font-size: ${font + 5.5}pt; font-weight: 700; }
.kv, .row { display: flex; justify-content: space-between; gap: 3pt; }
.kv .l { flex: 1; overflow: hidden; text-overflow: ellipsis; } .kv .r { flex: none; text-align: right; }
.big { font-size: ${font + 2.5}pt; font-weight: 700; }
.item .n { height: 12pt; line-height: 12pt; font-weight: 700; } .item .kv { height: 12pt; line-height: 12pt; }
.row span { display: inline-block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.hr { width: 100%; border-top: 1pt dashed #000; } .hr.solid { border-top-style: solid; } .hr.double { border-top: 3pt double #000; }
.t { white-space: normal; }
.nums { text-align: right; } .nums span { margin-left: 6pt; }
.sec { text-transform: uppercase; letter-spacing: 0.3pt; }
</style></head><body>${r.lines.map((l) => lineHtml(l, r, paper, stacked)).join('')}</body></html>`;
}
