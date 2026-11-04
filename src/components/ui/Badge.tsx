import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Square or round tile with a short label (doc kind, initials, account code). */
export function Badge({
  label,
  bg,
  fg = colors.ink,
  size = 42,
  radius = 14,
  round,
  fontSize = 12,
  weight = 700,
  style,
}: {
  label: string;
  bg: string;
  fg?: string;
  size?: number;
  radius?: number;
  round?: boolean;
  fontSize?: number;
  weight?: 700 | 800;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: round ? size / 2 : radius, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}>
      <Txt display={weight} size={fontSize} color={fg} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}
