import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Switch, View } from 'react-native';

import { BottomSheetList, useSheet, type SheetItem } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Buttons';
import { TextField } from '@/components/ui/Fields';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import type { Settings } from '@/db/schema';
import { updateSettings } from '@/db/services/settings';
import { bluetoothSupported, listPairedPrinters, type PairedDevice } from '@/features/printing/bluetooth';
import { printConfig, printReceipt } from '@/features/printing/output';
import { testReceipt } from '@/features/printing/testReceipt';
import { initials } from '@/lib/format';
import { toast } from '@/store/ui';
import { colors } from '@/theme/tokens';

/**
 * Printer settings: paper width, the paired Bluetooth printer, paper cut,
 * receipt footer and a test print.
 */
export function PrinterSection({ settings }: { settings: Settings }) {
  const cfg = printConfig(settings);
  const [footer, setFooter] = useState(settings.receiptFooter);
  const [devices, setDevices] = useState<PairedDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const sheet = useSheet();

  const fail = (title: string, e: unknown) => Alert.alert(title, e instanceof Error ? e.message : String(e));

  const choosePrinter = async () => {
    setLoading(true);
    try {
      setDevices(await listPairedPrinters());
      sheet.show(true);
    } catch (e) {
      fail('Could not list printers', e);
    } finally {
      setLoading(false);
    }
  };

  const testPrint = async () => {
    setTesting(true);
    try {
      const where = await printReceipt(testReceipt(settings.businessName, footer, cfg.paper), cfg);
      if (where === 'bluetooth') toast(`Test page sent to ${cfg.printerName}`);
    } catch (e) {
      fail('Could not print', e);
    } finally {
      setTesting(false);
    }
  };

  const items: SheetItem[] = devices
    .filter((d) => !sheet.search || `${d.name} ${d.address}`.toLowerCase().includes(sheet.search.toLowerCase()))
    .map((d) => ({
      type: 'item',
      key: d.address,
      badge: initials(d.name),
      badgeBg: d.deviceClass === 1536 ? colors.inventoryLight : colors.neutralChip,
      badgeFg: colors.ink,
      title: d.name,
      sub: d.address,
      rightSub: d.deviceClass === 1536 ? 'printer' : undefined,
      rightSubColor: colors.inventoryDark,
      selected: d.address === cfg.printerAddress,
      onPress: () => {
        updateSettings({ printerName: d.name, printerAddress: d.address });
        sheet.hide();
        toast(`${d.name} selected`);
      },
    }));

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 16, gap: 12 }}>
      <Txt display={700} size={17}>
        Printer
      </Txt>

      <View style={{ gap: 6 }}>
        <Txt size={12} w={600} color={colors.muted} style={{ marginLeft: 4 }}>
          Paper width
        </Txt>
        <SegmentedControl<'58' | '80'>
          variant="onWhite"
          trackColor={colors.bg}
          activeColor={colors.ink}
          value={String(cfg.paper) as '58' | '80'}
          onChange={(v) => updateSettings({ paperWidth: Number(v) })}
          options={[
            { value: '58', label: '58 mm · 2 inch' },
            { value: '80', label: '80 mm · 3 inch' },
          ]}
        />
      </View>

      {bluetoothSupported ? (
        <>
          <Tap
            onPress={loading ? undefined : choosePrinter}
            accessibilityLabel="Choose Bluetooth printer"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: 16, padding: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: cfg.printerAddress ? colors.ink : colors.white, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <ActivityIndicator color={colors.ink} /> : <Icon name="bluetooth" size={20} color={cfg.printerAddress ? colors.white : colors.muted} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={12} color={colors.muted}>
                Bluetooth printer
              </Txt>
              <Txt size={15} w={600} numberOfLines={1}>
                {cfg.printerName ?? 'Choose printer'}
              </Txt>
              {cfg.printerAddress ? (
                <Txt size={11} mono color={colors.muted}>
                  {cfg.printerAddress}
                </Txt>
              ) : null}
            </View>
            <Icon name="chevron" size={18} color={colors.muted} />
          </Tap>
          <Txt size={12} lh={17} color={colors.muted} style={{ marginHorizontal: 4 }}>
            Turn the printer on and pair it once in your phone&apos;s Settings › Bluetooth (the PIN is usually 0000 or 1234). Then choose it here.
          </Txt>
          {cfg.printerAddress ? (
            <Tap onPress={() => updateSettings({ printerName: null, printerAddress: null })} style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 4 }}>
              <Txt size={13} w={700} color={colors.dangerStrong}>
                Forget this printer
              </Txt>
            </Tap>
          ) : null}
        </>
      ) : (
        <Txt size={12} lh={17} color={colors.muted} style={{ marginHorizontal: 4 }}>
          Direct Bluetooth printing works in the Android app. Here, Print opens the system print dialog with a {cfg.paper} mm page.
        </Txt>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt size={14} w={600}>
            Cut paper after printing
          </Txt>
          <Txt size={12} color={colors.muted}>
            For printers with an auto-cutter
          </Txt>
        </View>
        <Switch
          value={cfg.cut}
          onValueChange={(v) => updateSettings({ printerCut: v })}
          trackColor={{ true: colors.sales, false: colors.neutralChip }}
          accessibilityLabel="Cut paper after printing"
        />
      </View>

      <TextField label="Message at the bottom of receipts" value={footer} onChangeText={setFooter} placeholder="Thank you for your business" autoCapitalize="sentences" />
      {footer !== settings.receiptFooter ? (
        <Button
          label="Save message"
          height={44}
          size={14}
          bg={colors.bg}
          fg={colors.ink}
          onPress={() => {
            updateSettings({ receiptFooter: footer.trim() });
            toast('Receipt message saved');
          }}
        />
      ) : null}

      <Button label={testing ? 'Printing…' : 'Print test page'} icon="printer" height={46} size={14} disabled={testing} onPress={testPrint} />

      <BottomSheetList
        visible={sheet.visible}
        onClose={sheet.hide}
        title="Paired devices"
        items={items}
        search={sheet.search}
        onSearch={sheet.setSearch}
        empty={
          <View style={{ paddingVertical: 16, gap: 12 }}>
            <Txt size={14} lh={20} color={colors.muted} align="center">
              No paired devices yet. Turn the printer on, pair it in Bluetooth settings, then come back and choose it.
            </Txt>
            <Button
              label="Open Bluetooth settings"
              icon="bluetooth"
              height={46}
              size={14}
              onPress={() => {
                sheet.hide();
                Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => Linking.openSettings());
              }}
            />
          </View>
        }
      />
    </View>
  );
}
