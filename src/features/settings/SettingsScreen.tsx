import { useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Buttons';
import { ErrorBanner, Loading } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Fields';
import { ScreenHeader } from '@/components/ui/Headers';
import { Txt } from '@/components/ui/Txt';
import { useSettings } from '@/db/hooks';
import { errorMessages } from '@/db/services/errors';
import { updateSettings } from '@/db/services/settings';
import { exportBackup, restoreBackup } from '@/lib/backup';
import { dateLabelLong } from '@/lib/format';
import { toast } from '@/store/ui';
import { PrinterSection } from '@/features/settings/PrinterSection';
import { colors } from '@/theme/tokens';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings().data;
  const [errors, setErrors] = useState<string[]>([]);
  if (!settings) return <Loading />;

  const run = async (fn: () => unknown | Promise<unknown>) => {
    try {
      setErrors([]);
      await fn();
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader kicker="Settings" title={settings.businessName} color={colors.ink} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <BusinessNameSection initial={settings.businessName} run={run} />

        <Section title="Stock">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt size={14} w={600}>
                Allow selling more than stock
              </Txt>
              <Txt size={12} lh={17} color={colors.muted} style={{ marginTop: 2 }}>
                When off, a sale or purchase return is blocked if it needs more pieces than you have.
              </Txt>
            </View>
            <Switch
              value={settings.allowNegativeStock}
              onValueChange={(v) => run(() => updateSettings({ allowNegativeStock: v }))}
              trackColor={{ true: colors.sales, false: colors.neutralChip }}
              accessibilityLabel="Allow negative stock"
            />
          </View>
        </Section>

        <PrinterSection key={settings.receiptFooter} settings={settings} />

        <Section title="Backup">
          <Txt size={12} lh={17} color={colors.muted}>
            {settings.lastBackupAt ? `Last backup ${dateLabelLong(settings.lastBackupAt.slice(0, 10))}.` : 'No backup yet.'} Your books live only on this phone, so keep a copy somewhere safe each week.
          </Txt>
          <Button label="Export backup" height={46} size={14} onPress={() => run(exportBackup)} />
          <Button
            label="Restore from backup"
            height={46}
            size={14}
            bg={colors.reportLight}
            fg={colors.danger}
            onPress={() =>
              Alert.alert('Replace all data?', 'Everything on this phone will be replaced by the backup you pick. This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Restore',
                  style: 'destructive',
                  onPress: () =>
                    run(async () => {
                      if (await restoreBackup()) toast('Backup restored');
                    }),
                },
              ])
            }
          />
        </Section>
        <ErrorBanner messages={errors} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 16, gap: 10 }}>
      <Txt display={700} size={17}>
        {title}
      </Txt>
      {children}
    </View>
  );
}

function BusinessNameSection({ initial, run }: { initial: string; run: (fn: () => unknown) => Promise<void> }) {
  const [name, setName] = useState(initial);
  return (
    <Section title="Business">
      <TextField label="Business name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Button
        label="Save name"
        height={46}
        size={14}
        onPress={() =>
          run(() => {
            updateSettings({ businessName: name.trim() });
            toast('Business name saved');
          })
        }
      />
    </Section>
  );
}
