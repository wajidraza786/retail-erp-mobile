import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

import { Badge } from './Badge';
import { SearchField } from './SearchField';
import { Tap } from './Tap';
import { Txt } from './Txt';

/**
 * Bottom sheet: dimmed backdrop, rounded top (28), grab handle, title and a close pill.
 * Built on RN `Modal` so it works in Expo Go with no extra native module.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  closeLabel = 'Close',
  children,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.backdrop }} />
        <View style={{ backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '82%', paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineDashed, alignSelf: 'center', marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 }}>
            <Txt display={800} size={20} accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </Txt>
            <Tap onPress={onClose} style={{ backgroundColor: colors.bg, borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Txt size={13} w={700}>
                {closeLabel}
              </Txt>
            </Tap>
          </View>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16 }}>
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 16 }}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export type SheetItem =
  | { type: 'header'; key: string; label: string }
  | {
      type: 'item';
      key: string;
      badge: string;
      badgeBg: string;
      badgeFg: string;
      title: string;
      sub?: string;
      right?: string;
      rightSub?: string;
      rightSubColor?: string;
      selected?: boolean;
      onPress: () => void;
    };

/** Searchable list for pickers (party, product, account) with optional section headers. */
export function BottomSheetList({
  visible,
  onClose,
  title,
  closeLabel,
  items,
  search,
  onSearch,
  empty,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  items: SheetItem[];
  search: string;
  onSearch: (s: string) => void;
  /** Shown instead of "Nothing matches" when the list is empty and not filtered. */
  empty?: ReactNode;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} closeLabel={closeLabel}>
      <SearchField soft value={search} onChangeText={onSearch} style={{ marginBottom: 8 }} />
      {items.map((o) =>
        o.type === 'header' ? (
          <Txt key={o.key} size={12} w={700} color={colors.muted} style={{ paddingTop: 12, paddingBottom: 6, paddingHorizontal: 4 }}>
            {o.label}
          </Txt>
        ) : (
          <Tap
            key={o.key}
            onPress={o.onPress}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: o.selected ? colors.bg : 'transparent' }}>
            <Badge label={o.badge} bg={o.badgeBg} fg={o.badgeFg} size={38} radius={12} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14.5} w={600} numberOfLines={1}>
                {o.title}
              </Txt>
              {o.sub ? (
                <Txt size={12} color={colors.muted} numberOfLines={1}>
                  {o.sub}
                </Txt>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {o.right ? (
                <Txt size={13.5} w={700} tabular>
                  {o.right}
                </Txt>
              ) : null}
              {o.rightSub ? (
                <Txt size={11} w={700} color={o.rightSubColor ?? colors.muted}>
                  {o.rightSub}
                </Txt>
              ) : null}
            </View>
          </Tap>
        ),
      )}
      {items.filter((i) => i.type === 'item').length === 0
        ? (!search && empty) || (
            <Txt size={14} color={colors.muted} align="center" style={{ paddingVertical: 24 }}>
              Nothing matches
            </Txt>
          )
        : null}
    </BottomSheet>
  );
}

/** Local state helper for a searchable sheet. */
export function useSheet<T = true>() {
  const [open, setOpen] = useState<T | null>(null);
  const [search, setSearch] = useState('');
  return {
    open,
    visible: open !== null,
    search,
    setSearch,
    show: (v: T) => {
      setSearch('');
      setOpen(v);
    },
    hide: () => setOpen(null),
  };
}
