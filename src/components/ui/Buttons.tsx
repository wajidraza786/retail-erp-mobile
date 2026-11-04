import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadow } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Tap } from './Tap';
import { Txt } from './Txt';

/** Extended pill FAB, bottom-right, ink. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={label}
      style={[
        {
          position: 'absolute',
          right: 16,
          bottom: 16,
          height: 54,
          paddingLeft: 16,
          paddingRight: 20,
          borderRadius: 27,
          backgroundColor: colors.ink,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        shadow.fab,
      ]}>
      <Icon name="plus" size={20} color={colors.white} strokeWidth={2.4} />
      <Txt size={15} w={700} color={colors.white}>
        {label}
      </Txt>
    </Tap>
  );
}

export function Button({
  label,
  onPress,
  bg = colors.ink,
  fg = colors.white,
  height = 52,
  radius = 16,
  icon,
  disabled,
  style,
  size = 15,
}: {
  label: string;
  onPress: () => void;
  bg?: string;
  fg?: string;
  height?: number;
  radius?: number;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: number;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      style={[{ height, borderRadius: radius, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }, style]}>
      {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2.2} /> : null}
      <Txt size={size} w={700} color={fg} numberOfLines={1}>
        {label}
      </Txt>
    </Tap>
  );
}

/** Sticky white footer holding the primary action of a form. */
export function FormFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 6, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }}>
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, bg, fg = colors.white, disabled }: { label: string; onPress: () => void; bg: string; fg?: string; disabled?: boolean }) {
  return <Button label={label} onPress={onPress} bg={bg} fg={fg} height={54} radius={18} size={16} disabled={disabled} />;
}

/** Small ink pill ("+ Add product"). */
export function PillButton({ label, onPress, icon = 'plus' }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Tap onPress={onPress} style={{ backgroundColor: colors.ink, borderRadius: 99, paddingVertical: 8, paddingLeft: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={16} color={colors.white} strokeWidth={2.6} />
      <Txt size={13} w={700} color={colors.white}>
        {label}
      </Txt>
    </Tap>
  );
}
