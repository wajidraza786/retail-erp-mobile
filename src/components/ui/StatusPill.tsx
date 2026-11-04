import { View } from 'react-native';

import type { InvoiceStatus } from '@/db/services/ledger';
import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

const STATUS: Record<InvoiceStatus, { label: string; bg: string; fg: string }> = {
  paid: { label: 'Paid', bg: colors.salesLight, fg: colors.salesDark },
  refunded: { label: 'Refunded', bg: colors.salesLight, fg: colors.salesDark },
  credited: { label: 'Credited', bg: colors.neutralChip, fg: colors.neutralText },
  partial: { label: 'Partial', bg: colors.inventoryLight, fg: colors.stockLedger },
  unpaid: { label: 'Unpaid', bg: colors.reportLight, fg: colors.danger },
};

export const statusLabel = (s: InvoiceStatus) => STATUS[s].label;

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const s = STATUS[status];
  return <Pill label={s.label} bg={s.bg} fg={s.fg} size={10.5} />;
}

export function Pill({ label, bg, fg, size = 12, padH = 8, padV = 2 }: { label: string; bg: string; fg: string; size?: number; padH?: number; padV?: number }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: padH, paddingVertical: padV, alignSelf: 'flex-start' }}>
      <Txt size={size} w={700} color={fg} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}
