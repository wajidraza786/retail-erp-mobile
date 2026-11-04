import type { ReactNode } from 'react';
import { TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Badge } from './Badge';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Txt } from './Txt';

export function FieldLabel({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <Txt size={small ? 11 : 12} w={600} color={colors.muted} style={{ marginLeft: 4, marginBottom: small ? 4 : 6 }}>
      {children}
    </Txt>
  );
}

/** Labelled input (height 50, radius 14, 1.5px border). */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  mono,
  bold,
  editable = true,
  style,
  height = 50,
  autoCapitalize,
}: {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  mono?: boolean;
  bold?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={style}>
      {label ? <FieldLabel small={height < 50}>{label}</FieldLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        editable={editable}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={{
          height,
          borderWidth: 1.5,
          borderColor: colors.lineStrong,
          borderRadius: height < 50 ? 12 : 14,
          paddingHorizontal: height < 50 ? 12 : 14,
          backgroundColor: editable ? colors.white : colors.bgSoft,
          color: editable ? colors.ink : colors.muted,
          fontFamily: mono ? fonts.mono500 : bold ? fonts.body600 : fonts.body500,
          fontSize: mono ? 14 : 15,
          paddingVertical: 0,
          textAlignVertical: 'center',
        }}
      />
    </View>
  );
}

/** Compact numeric input used inline in cards (discount, paid, rate). */
export function InlineNumberInput({
  value,
  onChangeText,
  width = 110,
  align = 'right',
  placeholder = '0',
  accessibilityLabel,
  height = 36,
}: {
  value: string;
  onChangeText: (s: string) => void;
  width?: number;
  align?: TextStyle['textAlign'];
  placeholder?: string;
  accessibilityLabel?: string;
  height?: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      keyboardType="decimal-pad"
      accessibilityLabel={accessibilityLabel}
      selectTextOnFocus
      style={{
        width,
        height,
        borderWidth: 1.5,
        borderColor: colors.lineStrong,
        borderRadius: 11,
        paddingHorizontal: 10,
        fontFamily: fonts.body600,
        fontSize: 14,
        textAlign: align,
        textAlignVertical: 'center',
        paddingVertical: 0,
        color: colors.ink,
        backgroundColor: colors.white,
      }}
    />
  );
}

/** − qty + stepper (min 1). */
export function QtyStepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, height: 38 }}>
      <Tap accessibilityLabel="Decrease quantity" onPress={() => onChange(Math.max(min, value - 1))} style={{ width: 36, height: 38, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={20} w={600}>
          −
        </Txt>
      </Tap>
      <Txt size={15} w={700} align="center" style={{ minWidth: 26 }} tabular>
        {value}
      </Txt>
      <Tap accessibilityLabel="Increase quantity" onPress={() => onChange(value + 1)} style={{ width: 36, height: 38, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={20} w={600}>
          +
        </Txt>
      </Tap>
    </View>
  );
}

/** White card with avatar + label + value + chevron; opens a sheet. */
export function PickerField({
  label,
  value,
  initials,
  color,
  light,
  onPress,
  style,
}: {
  label: string;
  value: string;
  initials: string;
  color: string;
  light: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={[{ backgroundColor: colors.white, borderRadius: 18, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <Badge label={initials} bg={light} fg={color} size={38} round fontSize={13} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={12} color={colors.muted}>
          {label}
        </Txt>
        <Txt size={15} w={600} numberOfLines={1}>
          {value}
        </Txt>
      </View>
      <Icon name="chevron" size={18} color={colors.muted} strokeWidth={2.2} />
    </Tap>
  );
}
