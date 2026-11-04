import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useSettings } from '@/db/hooks';
import { toWhatsAppNumber } from '@/lib/phone';
import { toast } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { bluetoothSupported } from './bluetooth';
import { printConfig, printReceipt, saveReceiptPdf, shareReceiptPdf, shareReceiptWhatsApp } from './output';
import type { Receipt } from './receipt';

type Action = 'print' | 'save' | 'whatsapp' | 'share';

/**
 * Print / Save / WhatsApp / Share for any receipt. `build` is called on demand so the
 * receipt always reflects the latest data. `phone` targets a WhatsApp chat directly.
 */
export function PrintShareSheet({
  visible,
  onClose,
  build,
  phone,
  partyName,
}: {
  visible: boolean;
  onClose: () => void;
  build: () => Receipt;
  phone?: string | null;
  partyName?: string;
}) {
  const settings = useSettings().data;
  const [busy, setBusy] = useState<Action | null>(null);
  if (!settings) return null;
  const cfg = printConfig(settings);
  const waNumber = toWhatsAppNumber(phone);
  const useBluetooth = bluetoothSupported && !!cfg.printerAddress;

  const run = async (action: Action) => {
    setBusy(action);
    try {
      const r = build();
      if (action === 'print') {
        const where = await printReceipt(r, cfg);
        if (where === 'bluetooth') toast(`Sent to ${cfg.printerName ?? 'printer'}`);
        onClose();
      } else if (action === 'save') {
        const where = await saveReceiptPdf(r, cfg.paper);
        if (where) {
          toast(`Saved ${where}`);
          onClose();
        }
      } else if (action === 'whatsapp') {
        onClose();
        await shareReceiptWhatsApp(r, phone);
      } else {
        onClose();
        await shareReceiptPdf(r, cfg.paper);
      }
    } catch (e) {
      Alert.alert(action === 'print' ? 'Could not print' : 'Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const options: { key: Action; icon: IconName; title: string; sub: string; bg: string; fg: string }[] = [
    {
      key: 'print',
      icon: 'printer',
      title: 'Print',
      sub: useBluetooth ? `${cfg.printerName} · ${cfg.paper} mm` : bluetoothSupported ? `No printer chosen · system print · ${cfg.paper} mm` : `System print · ${cfg.paper} mm`,
      bg: colors.ink,
      fg: colors.white,
    },
    {
      key: 'whatsapp',
      icon: 'chat',
      title: 'Send on WhatsApp',
      sub: waNumber ? `To ${partyName ?? 'customer'} · +${waNumber}` : 'Pick a chat',
      bg: colors.salesLight,
      fg: colors.sales,
    },
    { key: 'save', icon: 'download', title: 'Save PDF', sub: 'Keep a copy on this phone', bg: colors.purchaseLight, fg: colors.purchase },
    { key: 'share', icon: 'share', title: 'Share PDF', sub: 'WhatsApp, email, Drive …', bg: colors.accountsLight, fg: colors.accounts },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Print or share">
      <View style={{ gap: 8, paddingBottom: 4 }}>
        {options.map((o) => (
          <Tap
            key={o.key}
            onPress={busy ? undefined : () => run(o.key)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: colors.bg }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: o.bg, alignItems: 'center', justifyContent: 'center' }}>
              {busy === o.key ? <ActivityIndicator color={o.fg} /> : <Icon name={o.icon} size={22} color={o.fg} />}
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={15} w={700}>
                {o.title}
              </Txt>
              <Txt size={12} color={colors.muted} numberOfLines={1}>
                {o.sub}
              </Txt>
            </View>
          </Tap>
        ))}
      </View>
    </BottomSheet>
  );
}
