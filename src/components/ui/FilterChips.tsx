import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

import { Tap } from './Tap';
import { Txt } from './Txt';

export type Chip<T> = { value: T; label: string };

/** Horizontal chip row; active chip is ink, others white. */
export function FilterChips<T extends string | null>({
  chips,
  value,
  onChange,
  style,
  outlined,
  wrap,
}: {
  chips: Chip<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  /** Preset style used in date range bars (bordered, smaller). */
  outlined?: boolean;
  /** Wrap onto multiple lines instead of scrolling (forms). */
  wrap?: boolean;
}) {
  const items = chips.map((c) => {
    const active = c.value === value;
    return (
      <Tap
        key={String(c.value)}
        onPress={() => onChange(c.value)}
        accessibilityState={{ selected: active }}
        style={{
          borderRadius: 99,
          paddingHorizontal: outlined ? 12 : 14,
          paddingVertical: outlined ? 6 : 8,
          backgroundColor: active ? colors.ink : colors.white,
          borderWidth: outlined ? 1.5 : 0,
          borderColor: colors.lineStrong,
        }}>
        <Txt size={outlined ? 12.5 : 13} w={600} color={active ? colors.white : colors.ink}>
          {c.label}
        </Txt>
      </Tap>
    );
  });
  if (wrap) return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, style]}>{items}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={style} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
      {items}
    </ScrollView>
  );
}
