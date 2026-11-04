import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroFigure, ScreenHeader } from '@/components/ui/Headers';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useSettings } from '@/db/hooks';
import { PrintShareSheet } from '@/features/printing/PrintShareSheet';
import type { Receipt } from '@/features/printing/receipt';
import { colors } from '@/theme/tokens';

/** Coloured header (period, title, hero figure, chip) above a scrolling body. */
export function ReportLayout({
  title,
  period,
  color,
  heroLabel,
  hero,
  chip,
  children,
  printable,
}: {
  title: string;
  period: string;
  color: string;
  heroLabel: string;
  hero: string;
  chip?: string;
  children: ReactNode;
  /** Builds the printable version of the report (receives the business name). */
  printable?: (businessName: string) => Receipt;
}) {
  const insets = useSafeAreaInsets();
  const businessName = useSettings().data?.businessName ?? '';
  const [sheet, setSheet] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        kicker={period}
        title={title}
        color={color}
        style={{ paddingBottom: 20 }}
        right={
          printable ? (
            <Tap
              accessibilityLabel="Print or share report"
              onPress={() => setSheet(true)}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.onColor20, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="printer" size={20} color={colors.white} />
            </Tap>
          ) : undefined
        }>
        <HeroFigure label={heroLabel} value={hero} chip={chip} />
      </ScreenHeader>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {printable ? <PrintShareSheet visible={sheet} onClose={() => setSheet(false)} build={() => printable(businessName)} /> : null}
    </View>
  );
}

/** Small summary tile (Opening / Money in / Money out …). */
export function MiniTile({ label, value, bg = colors.white, fg = colors.ink, labelColor, bold }: { label: string; value: string; bg?: string; fg?: string; labelColor?: string; bold?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Txt size={11} color={labelColor ?? (bg === colors.white ? colors.muted : fg)} numberOfLines={1}>
        {label}
      </Txt>
      <Txt size={13.5} w={700} color={fg} tabular numberOfLines={1} adjustsFontSizeToFit style={bold ? { fontSize: 15 } : undefined}>
        {value}
      </Txt>
    </View>
  );
}

/** Table header row with fixed-width numeric columns. */
export function TableHead({ first, cols }: { first: string; cols: { label: string; width: number }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.lineStrong }}>
      <Txt size={10.5} w={700} color={colors.muted} style={{ flex: 1 }}>
        {first}
      </Txt>
      {cols.map((c) => (
        <Txt key={c.label} size={10.5} w={700} color={colors.muted} align="right" style={{ width: c.width }}>
          {c.label}
        </Txt>
      ))}
    </View>
  );
}

/** "Expand all / Collapse all" link. */
export function ExpandAll({ allOpen, onPress, color }: { allOpen: boolean; onPress: () => void; color: string }) {
  return (
    <Tap onPress={onPress} hitSlop={8} style={{ paddingVertical: 4 }}>
      <Txt size={13} w={700} color={color}>
        {allOpen ? 'Collapse all' : 'Expand all'}
      </Txt>
    </Tap>
  );
}
