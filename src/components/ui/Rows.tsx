import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { InvoiceStatus } from '@/db/services/ledger';
import { colors, tints } from '@/theme/tokens';

import { Badge } from './Badge';
import { StatusPill, Pill } from './StatusPill';
import { Tap } from './Tap';
import { Txt } from './Txt';

const rowCard: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14 };

/** White rounded card section with optional divider rows. */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[{ backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden' }, padded && { paddingHorizontal: 16, paddingVertical: 6 }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 12, marginHorizontal: 20 }}>
      <Txt display={700} size={17}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

/** Badge + title/sub + amount + status pill (invoice lists). */
export function DocRow({
  kind,
  color,
  light,
  title,
  sub,
  amount,
  status,
  onPress,
}: {
  kind: string;
  color: string;
  light: string;
  title: string;
  sub: string;
  amount: string;
  status: InvoiceStatus;
  onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} style={rowCard}>
      <Badge label={kind} bg={light} fg={color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} w={600} numberOfLines={1}>
          {title}
        </Txt>
        <Txt size={12} color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt display={700} size={15} tabular>
          {amount}
        </Txt>
        <View style={{ marginTop: 3 }}>
          <StatusPill status={status} />
        </View>
      </View>
    </Tap>
  );
}

/** Avatar initials + name/phone + balance with "owes you / you owe / settled". */
export function PartyRow({
  initials,
  name,
  phone,
  balance,
  balanceLabel,
  balanceColor,
  color,
  light,
  onPress,
}: {
  initials: string;
  name: string;
  phone: string;
  balance: string;
  balanceLabel: string;
  balanceColor: string;
  color: string;
  light: string;
  onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} style={rowCard}>
      <Badge label={initials} bg={light} fg={color} round fontSize={13} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} w={600} numberOfLines={1}>
          {name}
        </Txt>
        <Txt size={12} color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
          {phone}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt display={700} size={15} color={balanceColor} tabular>
          {balance}
        </Txt>
        <Txt size={11} color={colors.muted} style={{ marginTop: 2 }}>
          {balanceLabel}
        </Txt>
      </View>
    </Tap>
  );
}

/** Tinted brand initials + name / brand · category / price + stock pill. */
export function ProductRow({
  initials,
  tintIndex,
  name,
  sub,
  price,
  stock,
  low,
  onPress,
}: {
  initials: string;
  tintIndex: number;
  name: string;
  sub: string;
  price: string;
  stock: string;
  low: boolean;
  onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} style={[rowCard, { padding: 12 }]}>
      <Badge label={initials} bg={tints[tintIndex % tints.length]} size={52} radius={15} fontSize={15} weight={800} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14.5} w={600} numberOfLines={1}>
          {name}
        </Txt>
        <Txt size={12} color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Txt>
        <Txt display={700} size={14} tabular style={{ marginTop: 3 }}>
          {price}
        </Txt>
      </View>
      <Pill label={stock} bg={low ? colors.reportLight : colors.neutralPill} fg={low ? colors.danger : colors.neutralText} padH={10} padV={4} />
    </Tap>
  );
}

/** Generic list row: badge + title/sub + right amount (+ optional right sub). */
export function ListRow({
  badge,
  badgeBg,
  badgeFg,
  badgeRound,
  title,
  sub,
  right,
  rightColor = colors.ink,
  rightSub,
  rightSubColor = colors.muted,
  onPress,
  card = true,
  divider,
  badgeSize = 42,
}: {
  badge: string;
  badgeBg: string;
  badgeFg: string;
  badgeRound?: boolean;
  title: string;
  sub?: string;
  right?: string;
  rightColor?: string;
  rightSub?: string;
  rightSubColor?: string;
  onPress?: () => void;
  card?: boolean;
  divider?: boolean;
  badgeSize?: number;
}) {
  return (
    <Tap
      onPress={onPress}
      style={[
        card ? rowCard : { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
        divider && { borderBottomWidth: 1, borderBottomColor: colors.line },
      ]}>
      <Badge label={badge} bg={badgeBg} fg={badgeFg} size={badgeSize} radius={badgeSize > 40 ? 14 : 13} round={badgeRound} fontSize={badge.length > 2 ? 11 : 12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={card ? 14.5 : 14} w={600} numberOfLines={1}>
          {title}
        </Txt>
        {sub ? (
          <Txt size={12} color={colors.muted} style={{ marginTop: 1 }} numberOfLines={1}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right !== undefined ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Txt display={700} size={14.5} color={rightColor} tabular numberOfLines={1}>
            {right}
          </Txt>
          {rightSub ? (
            <Txt size={11.5} color={rightSubColor} style={{ marginTop: 1 }}>
              {rightSub}
            </Txt>
          ) : null}
        </View>
      ) : null}
    </Tap>
  );
}

/** Date block + title/ref + signed amount + running balance (ledgers, cash book). */
export function LedgerRow({
  day,
  mon,
  title,
  ref,
  amount,
  amountColor,
  balance,
  onPress,
  compact,
}: {
  day: string;
  mon: string;
  title: string;
  ref: string;
  amount: string;
  amountColor: string;
  balance: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Tap
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: compact ? 11 : 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ width: compact ? 34 : 38, alignItems: 'center' }}>
        <Txt display={700} size={compact ? 15 : 16} lh={compact ? 16 : 17}>
          {day}
        </Txt>
        <Txt size={11} color={colors.muted}>
          {mon}
        </Txt>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={compact ? 13.5 : 14} w={600} numberOfLines={1}>
          {title}
        </Txt>
        <Txt size={compact ? 11.5 : 12} color={colors.muted} numberOfLines={1}>
          {ref}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt size={compact ? 13.5 : 14} w={700} color={amountColor} tabular>
          {amount}
        </Txt>
        <Txt size={compact ? 11.5 : 12} color={colors.muted} tabular>
          {balance}
        </Txt>
      </View>
    </Tap>
  );
}

/** Label/value line inside a totals or statement card. */
export function KeyValueRow({
  label,
  value,
  first,
  bold,
  big,
  muted,
  valueColor,
  onPress,
  dark,
  indent,
}: {
  label: string;
  value: string;
  first?: boolean;
  bold?: boolean;
  big?: number;
  muted?: boolean;
  valueColor?: string;
  onPress?: () => void;
  dark?: boolean;
  indent?: number;
}) {
  const fg = dark ? colors.white : muted ? colors.muted : colors.ink;
  const size = big ?? 14;
  const w = bold ? 700 : 500;
  return (
    <Tap
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: dark ? 'rgba(255,255,255,0.15)' : colors.line,
      }}>
      <Txt size={size} w={w} color={fg} style={{ paddingLeft: indent ?? 0, flexShrink: 1 }}>
        {label}
      </Txt>
      <Txt size={size} w={w} color={valueColor ?? fg} tabular>
        {value}
      </Txt>
    </Tap>
  );
}
