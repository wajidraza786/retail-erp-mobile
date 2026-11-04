import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUi } from '@/store/ui';
import { colors, shadow } from '@/theme/tokens';

import { Txt } from './Txt';

/** Coral validation message shown above a form footer. */
export function ErrorBanner({ messages }: { messages: string[] }) {
  if (!messages.length) return null;
  return (
    <View style={{ gap: 8, marginTop: 10 }} accessibilityLiveRegion="polite">
      {messages.map((m) => (
        <View key={m} style={{ backgroundColor: colors.reportLight, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
          <Txt size={13} w={600} color={colors.danger}>
            {m}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Txt size={14} color={colors.muted} align="center" style={{ paddingVertical: 40 }}>
      {text}
    </Txt>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

/** Global toast, rendered once in the root layout. */
export function Toast() {
  const msg = useUi((s) => s.toast);
  const hide = useUi((s) => s.hideToast);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [msg, hide]);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 100, alignItems: 'center', zIndex: 80 }}>
      <View style={[{ backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 }, shadow.fab]} accessibilityLiveRegion="polite">
        <Txt size={14} w={600} color={colors.white}>
          {msg}
        </Txt>
      </View>
    </View>
  );
}
