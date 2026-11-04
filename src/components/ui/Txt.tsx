import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors } from '@/theme/tokens';
import { bodyFont, displayFont, fonts, type BodyWeight, type DisplayWeight } from '@/theme/typography';

type Props = TextProps & {
  size?: number;
  color?: string;
  /** DM Sans weight (default 400). Ignored when `display` or `mono` is set. */
  w?: BodyWeight;
  /** Bricolage Grotesque at the given weight. */
  display?: DisplayWeight;
  mono?: boolean | 500 | 600;
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  lh?: number;
  ls?: number;
};

/** Base text. Picks the right font family per weight (Android ignores fontWeight for custom fonts). */
export function Txt({ size = 14, color = colors.ink, w = 400, display, mono, tabular, align, lh, ls, style, ...rest }: Props) {
  const fontFamily = display ? displayFont(display) : mono ? (mono === 600 ? fonts.mono600 : fonts.mono500) : bodyFont(w);
  return (
    <Text
      allowFontScaling={false}
      {...rest}
      style={[
        { fontFamily, fontSize: size, color },
        tabular && { fontVariant: ['tabular-nums'] },
        align && { textAlign: align },
        lh !== undefined && { lineHeight: lh },
        ls !== undefined && { letterSpacing: ls },
        style,
      ]}
    />
  );
}
