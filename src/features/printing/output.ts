import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Share } from 'react-native';

import type { Settings } from '@/db/schema';
import { toWhatsAppNumber } from '@/lib/phone';

import { bluetoothSupported, printBluetooth } from './bluetooth';
import { receiptEscPos, toBase64 } from './escpos';
import { PAPER, receiptHeight, receiptHtml, receiptText, type PaperWidth, type Receipt } from './receipt';

export type PrintConfig = { paper: PaperWidth; cut: boolean; printerAddress: string | null; printerName: string | null };

export const printConfig = (s: Settings): PrintConfig => ({
  paper: s.paperWidth === 58 ? 58 : 80,
  cut: s.printerCut,
  printerAddress: s.printerAddress,
  printerName: s.printerName,
});

const fileSafe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '-');

/** Renders the receipt to a PDF the width of the roll, named after the document. */
export async function receiptPdf(r: Receipt, paper: PaperWidth): Promise<File> {
  const { uri } = await Print.printToFileAsync({ html: receiptHtml(r, paper), width: PAPER[paper].px, height: receiptHeight(r, paper) });
  const target = new File(Paths.cache, `${fileSafe(r.fileName)}.pdf`);
  if (target.exists) target.delete();
  new File(uri).move(target);
  return target;
}

/**
 * Prints on the saved Bluetooth printer (ESC/POS). Without one — or on iPhone —
 * opens the system print dialog with a PDF the width of the roll.
 * Returns where it printed.
 */
export async function printReceipt(r: Receipt, cfg: PrintConfig): Promise<'bluetooth' | 'system'> {
  if (bluetoothSupported && cfg.printerAddress) {
    await printBluetooth(cfg.printerAddress, toBase64(receiptEscPos(r, { paper: cfg.paper, cut: cfg.cut })));
    return 'bluetooth';
  }
  const pdf = await receiptPdf(r, cfg.paper);
  await Print.printAsync({ uri: pdf.uri });
  return 'system';
}

/**
 * Saves the PDF where the user can find it.
 * Android: the user picks a folder (Downloads, Documents …).
 * iOS: Files › On My iPhone › Accounts & Inventory › Receipts.
 * Returns a short description of where it went, or null if cancelled.
 */
export async function saveReceiptPdf(r: Receipt, paper: PaperWidth): Promise<string | null> {
  const pdf = await receiptPdf(r, paper);
  const name = `${fileSafe(r.fileName)}.pdf`;
  if (Platform.OS === 'android') {
    let dir: Directory;
    try {
      dir = await Directory.pickDirectoryAsync();
    } catch {
      return null; // picker dismissed
    }
    dir.createFile(name, 'application/pdf').write(pdf.bytesSync());
    return name;
  }
  const dir = new Directory(Paths.document, 'Receipts');
  if (!dir.exists) dir.create();
  const out = new File(dir, name);
  if (out.exists) out.delete();
  pdf.copy(out);
  return `Files › Accounts & Inventory › Receipts › ${name}`;
}

/** System share sheet with the PDF attached (WhatsApp, email, Drive …). */
export async function shareReceiptPdf(r: Receipt, paper: PaperWidth) {
  const pdf = await receiptPdf(r, paper);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', dialogTitle: r.title, UTI: 'com.adobe.pdf' });
}

/**
 * Sends the receipt as a text message. With a phone number it opens that WhatsApp chat
 * directly; without one it opens the share sheet so the user can pick a chat.
 */
export async function shareReceiptWhatsApp(r: Receipt, phone?: string | null) {
  const text = receiptText(r);
  const number = toWhatsAppNumber(phone);
  if (number) {
    try {
      await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(text)}`);
      return;
    } catch {
      // fall through to the share sheet
    }
  }
  await Share.share({ message: text, title: r.title });
}
