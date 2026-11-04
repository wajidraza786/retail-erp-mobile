import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { addDays, monthStart, parseDate, toISODate, today, type ISODate } from '@/lib/dates';
import { dateLabelLong } from '@/lib/format';
import { useReportRange } from '@/store/reportRange';
import { colors } from '@/theme/tokens';

import { BottomSheet } from './BottomSheet';
import { Button } from './Buttons';
import { FieldLabel } from './Fields';
import { FilterChips } from './FilterChips';
import { Tap } from './Tap';
import { Txt } from './Txt';

function DateField({ label, value, onChange }: { label: string; value: ISODate; onChange: (d: ISODate) => void }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(parseDate(value));
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: parseDate(value), mode: 'date', onChange: (e, d) => e.type === 'set' && d && onChange(toISODate(d)) });
    } else {
      setDraft(parseDate(value));
      setIosOpen(true);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <FieldLabel small>{label}</FieldLabel>
      <Tap
        onPress={open}
        accessibilityLabel={`${label} date, ${dateLabelLong(value)}`}
        style={{ height: 44, borderWidth: 1.5, borderColor: colors.lineStrong, borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center', backgroundColor: colors.bg }}>
        <Txt size={14} w={600}>
          {dateLabelLong(value)}
        </Txt>
      </Tap>
      {Platform.OS === 'ios' ? (
        <BottomSheet visible={iosOpen} onClose={() => setIosOpen(false)} title={label} scroll={false}>
          <DateTimePicker value={draft} mode="date" display="inline" onChange={(_, d) => d && setDraft(d)} accentColor={colors.ink} />
          <Button
            label="Done"
            onPress={() => {
              onChange(toISODate(draft));
              setIosOpen(false);
            }}
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}

/** From / To + presets. Reads and writes the shared report range. */
export function DateRangeBar({ withYesterday, children }: { withYesterday?: boolean; children?: React.ReactNode }) {
  const { from, to, setFrom, setTo, setRange } = useReportRange();
  const t = today();
  const presets: [string, ISODate, ISODate][] = [
    ['Today', t, t],
    ...(withYesterday ? ([['Yesterday', addDays(t, -1), addDays(t, -1)]] as [string, ISODate, ISODate][]) : []),
    ['Last 7 days', addDays(t, -6), t],
    ['This month', monthStart(t), t],
  ];
  const active = presets.find(([, a, b]) => a === from && b === to)?.[0] ?? null;
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <DateField label="From" value={from} onChange={setFrom} />
        <DateField label="To" value={to} onChange={setTo} />
      </View>
      <FilterChips
        outlined
        chips={presets.map(([label]) => ({ value: label, label }))}
        value={active}
        onChange={(label) => {
          const p = presets.find(([l]) => l === label);
          if (p) setRange(p[1], p[2]);
        }}
        style={{ marginTop: 10, marginHorizontal: -16 }}
      />
      {children}
    </View>
  );
}
