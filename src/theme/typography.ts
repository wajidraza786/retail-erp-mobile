import type { TextStyle } from 'react-native';

import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';

/** Passed to `useFonts` in the root layout. */
export const fontAssets = {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
};

/**
 * Custom fonts on Android ignore `fontWeight`, so each weight is its own family.
 */
export const fonts = {
  display600: 'BricolageGrotesque_600SemiBold',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'DMSans_400Regular',
  body500: 'DMSans_500Medium',
  body600: 'DMSans_600SemiBold',
  body700: 'DMSans_700Bold',
  mono500: 'JetBrainsMono_500Medium',
  mono600: 'JetBrainsMono_600SemiBold',
} as const;

export type BodyWeight = 400 | 500 | 600 | 700;
export type DisplayWeight = 600 | 700 | 800;

export const bodyFont = (w: BodyWeight = 400) =>
  ({ 400: fonts.body400, 500: fonts.body500, 600: fonts.body600, 700: fonts.body700 })[w];

export const displayFont = (w: DisplayWeight = 800) =>
  ({ 600: fonts.display600, 700: fonts.display700, 800: fonts.display800 })[w];

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Named text roles from PRD §3.2. */
export const type = {
  tabTitle: { fontFamily: fonts.display800, fontSize: 34, lineHeight: 36, letterSpacing: -1 },
  screenTitle: { fontFamily: fonts.display800, fontSize: 22, lineHeight: 25 },
  hero: { fontFamily: fonts.display800, fontSize: 36, lineHeight: 40, letterSpacing: -0.7, ...tabular },
  heroLarge: { fontFamily: fonts.display800, fontSize: 42, lineHeight: 46, letterSpacing: -1.2, ...tabular },
  section: { fontFamily: fonts.display700, fontSize: 17 },
  amount: { fontFamily: fonts.display700, fontSize: 15, ...tabular },
  body: { fontFamily: fonts.body500, fontSize: 15 },
  rowTitle: { fontFamily: fonts.body600, fontSize: 15 },
  meta: { fontFamily: fonts.body400, fontSize: 12 },
  label: { fontFamily: fonts.body600, fontSize: 12 },
  mono: { fontFamily: fonts.mono500, fontSize: 11 },
  tabular,
} satisfies Record<string, TextStyle>;
