import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Tap } from './Tap';
import { Txt } from './Txt';

type Option<T extends string> = { value: T; label: string };

/**
 * `onColor`: sits on a module header (dark track, white active pill in module colour text).
 * `onWhite`: sits on the page (white track, active pill filled with `activeColor`).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'onColor',
  activeColor = colors.ink,
  trackColor,
  inactiveText,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  variant?: 'onColor' | 'onWhite';
  activeColor?: string;
  trackColor?: string;
  inactiveText?: string;
}) {
  const onColor = variant === 'onColor';
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', backgroundColor: trackColor ?? (onColor ? colors.shade20 : colors.white), borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        const bg = active ? (onColor ? colors.white : activeColor) : 'transparent';
        const fg = active ? (onColor ? activeColor : colors.white) : (inactiveText ?? (onColor ? colors.white : colors.ink));
        return (
          <Tap
            key={o.value}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, borderRadius: 11, paddingVertical: 9, alignItems: 'center', backgroundColor: bg }}>
            <Txt size={13} w={600} color={fg}>
              {o.label}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}
