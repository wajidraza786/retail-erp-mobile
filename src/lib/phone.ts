/**
 * Converts a local Pakistani number to the international digits WhatsApp expects:
 * "0300 4412870" → "923004412870", "+92 300 4412870" → "923004412870".
 * Returns null when the input doesn't look like a phone number.
 */
export function toWhatsAppNumber(phone: string | null | undefined, countryCode = '92'): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith(countryCode)) return digits;
  if (digits.startsWith('0')) return countryCode + digits.slice(1);
  return digits;
}
