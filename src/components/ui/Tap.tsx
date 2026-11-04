import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> };

/**
 * Pressable with a subtle pressed state, used for every tappable row and button.
 * Without `onPress` it renders a plain View, so read-only rows are never dimmed.
 */
export function Tap({ style, disabled, ...rest }: Props) {
  if (!rest.onPress && !rest.onLongPress) return <View style={style}>{rest.children as React.ReactNode}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [style, pressed && !disabled && { opacity: 0.72 }, disabled && { opacity: 0.45 }]}
    />
  );
}
