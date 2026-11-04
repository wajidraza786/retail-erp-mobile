/**
 * ESC/POS encoder for generic 58 / 80 mm thermal printers (text mode, Font A).
 */
import { PAPER, receiptTextLines, type PaperWidth, type Receipt, type TextLine } from './receipt';

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  init: [ESC, 0x40],
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  sizeNormal: [GS, 0x21, 0x00],
  sizeTall: [GS, 0x21, 0x01],
  sizeBig: [GS, 0x21, 0x11],
  feed: (n: number) => [ESC, 0x64, n],
  /** Feed to the cutter and partial-cut. Printers without a cutter ignore it. */
  cut: [GS, 0x56, 0x42, 0x00],
};

/** Printers only know ASCII (code page 437); map the typography the app uses. */
const ASCII: Record<string, string> = { '−': '-', '–': '-', '—': '-', '×': 'x', '…': '.', '·': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '›': '>', '₨': 'Rs' };

export function toAscii(s: string): string {
  return s.replace(/[^\x20-\x7e]/g, (c) => ASCII[c] ?? '?');
}

function encodeLine(l: TextLine, out: number[]) {
  out.push(...(l.align === 'center' ? CMD.alignCenter : CMD.alignLeft));
  out.push(...(l.bold ? CMD.boldOn : CMD.boldOff));
  out.push(...(l.size === 'big' ? CMD.sizeBig : l.size === 'tall' ? CMD.sizeTall : CMD.sizeNormal));
  for (const ch of toAscii(l.text)) out.push(ch.charCodeAt(0));
  out.push(0x0a);
}

export function receiptEscPos(r: Receipt, opts: { paper: PaperWidth; cut: boolean }): Uint8Array {
  const out: number[] = [...CMD.init];
  receiptTextLines(r, PAPER[opts.paper].chars).forEach((l) => encodeLine(l, out));
  out.push(...CMD.sizeNormal, ...CMD.boldOff, ...CMD.alignLeft, ...CMD.feed(4));
  if (opts.cut) out.push(...CMD.cut);
  return Uint8Array.from(out);
}

/** Base64 for the native bridge (no Buffer in React Native). */
export function toBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : chars[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : chars[c & 63];
  }
  return out;
}
