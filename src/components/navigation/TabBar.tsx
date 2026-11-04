import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { colors } from '@/theme/tokens';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Each tab owns a colour: active label in the module colour, icon on a tinted pill. */
const TABS: Record<string, { label: string; icon: IconName; fg: string; bg: string }> = {
  index: { label: 'Home', icon: 'home', fg: colors.ink, bg: colors.neutralChip },
  sales: { label: 'Sales', icon: 'sales', fg: colors.sales, bg: colors.salesLight },
  purchase: { label: 'Purchase', icon: 'cart', fg: colors.purchase, bg: colors.purchaseLight },
  inventory: { label: 'Inventory', icon: 'box', fg: colors.inventoryDark, bg: colors.inventoryLight },
  accounts: { label: 'Accounts', icon: 'book', fg: colors.accounts, bg: colors.accountsLight },
};

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: 'rgba(23,22,28,0.07)',
        paddingTop: 8,
        paddingHorizontal: 6,
        paddingBottom: Math.max(insets.bottom, 12) + 4,
      }}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const fg = focused ? tab.fg : colors.tabIdle;
        return (
          <Tap
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <View style={{ width: 54, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? tab.bg : 'transparent' }}>
              <Icon name={tab.icon} size={22} color={fg} />
            </View>
            <Txt size={11} w={700} color={fg}>
              {tab.label}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}
