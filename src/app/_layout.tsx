import { QueryClientProvider } from '@tanstack/react-query';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

import { Toast } from '@/components/ui/Feedback';
import { Txt } from '@/components/ui/Txt';
import { db, sqlite } from '@/db/client';
import { useSettings } from '@/db/hooks';
import migrations from '@/db/migrations/migrations';
import { ensureSeeded } from '@/db/seed';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/tokens';
import { fontAssets } from '@/theme/typography';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const { success, error } = useMigrations(db, migrations);
  useDrizzleStudio(__DEV__ ? sqlite : null);

  // Seeding is idempotent (guarded by settings.seeded_at) and synchronous.
  const seed = useMemo(() => {
    if (!success) return null;
    try {
      ensureSeeded();
      return { ok: true as const };
    } catch (e) {
      return { error: e as Error };
    }
  }, [success]);

  const failure = error ?? (seed && 'error' in seed ? seed.error : null);
  const ready = (fontsLoaded || !!fontError) && !!seed && 'ok' in seed;

  useEffect(() => {
    if (ready || failure) SplashScreen.hideAsync();
  }, [ready, failure]);

  if (failure) return <StartupError message={failure.message} />;
  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AppStack />
      <Toast />
    </QueryClientProvider>
  );
}

/** First launch goes to business setup; afterwards the tabs are the root. */
function AppStack() {
  const { data: settings } = useSettings();
  if (!settings) return null;
  const needsSetup = !settings.setupCompletedAt;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={needsSetup}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={!needsSetup}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="invoice/new" />
        <Stack.Screen name="invoice/[id]" />
        <Stack.Screen name="voucher/new" />
        <Stack.Screen name="voucher/[id]" />
        <Stack.Screen name="ledger/[accountId]" />
        <Stack.Screen name="product" />
        <Stack.Screen name="report/[type]" />
        <Stack.Screen name="settings" />
      </Stack.Protected>
    </Stack>
  );
}

function StartupError({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }}>
      <Txt size={22} display={800}>
        The books could not be opened
      </Txt>
      <Txt size={14} color={colors.muted} style={{ marginTop: 8 }}>
        A database migration failed. Your data has not been changed. Restart the app, and if this keeps happening, restore a backup.
      </Txt>
      <View style={{ marginTop: 16, backgroundColor: colors.reportLight, borderRadius: 12, padding: 12 }}>
        <Txt size={12} mono color={colors.danger}>
          {message}
        </Txt>
      </View>
    </View>
  );
}
