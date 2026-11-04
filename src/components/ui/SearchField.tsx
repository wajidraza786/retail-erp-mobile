import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Icon } from './Icon';

/** Search box: white on the page, warm-grey (`soft`) inside cards and sheets. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  soft,
  style,
}: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  soft?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: soft ? colors.bg : colors.white,
          borderRadius: soft ? 12 : 16,
          paddingHorizontal: soft ? 12 : 14,
          height: soft ? 44 : 46,
        },
        style,
      ]}>
      <Icon name="search" size={soft ? 17 : 18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{ flex: 1, fontFamily: fonts.body400, fontSize: soft ? 14.5 : 15, color: colors.ink, paddingVertical: 0 }}
      />
    </View>
  );
}
