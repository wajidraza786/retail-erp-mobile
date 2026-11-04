import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sales" />
      <Tabs.Screen name="purchase" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="accounts" />
    </Tabs>
  );
}
