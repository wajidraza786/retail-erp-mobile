import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { VOUCHER_KINDS } from '@/db/schema';
import { VOUCHER_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

/** Three coloured cards with plain-language descriptions. */
export function VoucherTypeChooser({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="New voucher">
      <View style={{ gap: 8, paddingBottom: 4 }}>
        {VOUCHER_KINDS.map((k) => {
          const m = VOUCHER_META[k];
          return (
            <Tap
              key={k}
              onPress={() => {
                onClose();
                nav.newVoucher(k);
              }}
              style={{ backgroundColor: m.color, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.onColor20, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icon} size={24} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt display={800} size={18} color={colors.white}>
                  {m.short}
                </Txt>
                <Txt size={13} color={colors.white} style={{ marginTop: 2 }}>
                  {m.desc}
                </Txt>
              </View>
            </Tap>
          );
        })}
      </View>
    </BottomSheet>
  );
}
