import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/theme/tokens';

import { Icon } from './Icon';
import { Tap } from './Tap';
import { Txt } from './Txt';

/** Status bar text colour for the focused screen's header (light on colour, dark on amber). */
export function HeaderStatusBar({ fg }: { fg: string }) {
  const focused = useIsFocused();
  return focused ? <StatusBar style={fg === colors.ink ? 'dark' : 'light'} /> : null;
}

/**
 * Coloured block at the top of each tab: title, right label, stats and a
 * segmented control. Rounded bottom corners (32).
 */
export function ModuleHeader({
  title,
  right,
  color,
  fg = colors.white,
  children,
}: {
  title: string;
  right?: string;
  color: string;
  fg?: string;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: color,
        paddingTop: insets.top + 14,
        paddingHorizontal: 20,
        paddingBottom: 18,
        borderBottomLeftRadius: radii.header,
        borderBottomRightRadius: radii.header,
      }}>
      <HeaderStatusBar fg={fg} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Txt display={800} size={34} lh={36} ls={-1} color={fg} accessibilityRole="header">
          {title}
        </Txt>
        {right ? (
          <Txt size={13} w={fg === colors.ink ? 600 : 500} color={fg}>
            {right}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Two translucent stat tiles inside a module header. */
export function HeaderStats({ items, fg = colors.white, tileBg = colors.onColor15 }: { items: { label: string; value: string }[]; fg?: string; tileBg?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
      {items.map((s) => (
        <View key={s.label} style={{ flex: 1, backgroundColor: tileBg, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Txt size={12} w={fg === colors.ink ? 500 : 400} color={fg}>
            {s.label}
          </Txt>
          <Txt display={700} size={20} color={fg} tabular numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2 }}>
            {s.value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function BackButton({ fg = colors.white, bg = colors.onColor20, onPress }: { fg?: string; bg?: string; onPress?: () => void }) {
  return (
    <Tap
      accessibilityLabel="Back"
      hitSlop={6}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="back" size={20} color={fg} strokeWidth={2.2} />
    </Tap>
  );
}

/**
 * Header of a pushed screen: back button, small kicker line and screen title.
 * `overlap` leaves room for a card that overlaps the header (detail views).
 */
export function ScreenHeader({
  kicker,
  title,
  color,
  fg = colors.white,
  right,
  children,
  overlap,
  kickerMono,
  style,
}: {
  kicker?: string;
  title: string;
  color: string;
  fg?: string;
  right?: ReactNode;
  children?: ReactNode;
  overlap?: boolean;
  kickerMono?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const onAmber = fg === colors.ink;
  return (
    <View
      style={[
        {
          backgroundColor: color,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: overlap ? 70 : 18,
          borderBottomLeftRadius: overlap ? 0 : radii.headerPushed,
          borderBottomRightRadius: overlap ? 0 : radii.headerPushed,
        },
        style,
      ]}>
      <HeaderStatusBar fg={fg} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton fg={fg} bg={onAmber ? colors.onColor35 : colors.onColor20} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {kicker ? (
            <Txt size={12} w={onAmber ? 600 : 500} mono={kickerMono} color={fg} numberOfLines={1}>
              {kicker}
            </Txt>
          ) : null}
          <Txt display={800} size={22} lh={25} color={fg} numberOfLines={1} accessibilityRole="header">
            {title}
          </Txt>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Large figure block used by Ledger and Report headers. */
export function HeroFigure({ label, value, chip, fg = colors.white }: { label: string; value: string; chip?: string; fg?: string }) {
  return (
    <View>
      <Txt size={13} color={fg} style={{ marginTop: 16 }}>
        {label}
      </Txt>
      <Txt display={800} size={36} lh={40} ls={-0.7} color={fg} tabular numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
      {chip ? (
        <View style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.onColor20, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5 }}>
          <Txt size={12} w={700} color={fg}>
            {chip}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
