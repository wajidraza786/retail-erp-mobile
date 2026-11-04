import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import type { CoaNode } from '@/db/queries/accounts';
import { fmtParen } from '@/lib/format';
import { nav } from '@/features/shared/navigation';
import { colors } from '@/theme/tokens';

const DEFAULT_OPEN = new Set(['1', '11', '2', '21', '4', '5']);

/** Expandable Chart of Accounts. Groups toggle; leaves open their ledger. */
export function CoaTree({ nodes }: { nodes: CoaNode[] }) {
  const [open, setOpen] = useState<Set<string>>(DEFAULT_OPEN);
  const toggle = (code: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });

  const rows: CoaNode[] = [];
  const walk = (ns: CoaNode[]) =>
    ns.forEach((n) => {
      rows.push(n);
      if (n.isGroup && open.has(n.account.code)) walk(n.children);
    });
  walk(nodes);

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 22, overflow: 'hidden' }}>
      {rows.map((n) => {
        const isOpen = open.has(n.account.code);
        return (
          <Tap
            key={n.account.id}
            accessibilityLabel={`${n.account.code} ${n.account.name}`}
            accessibilityState={n.isGroup ? { expanded: isOpen } : undefined}
            onPress={() => (n.isGroup ? toggle(n.account.code) : nav.ledger(n.account.id))}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingRight: 14,
              paddingLeft: 14 + n.depth * 16,
              backgroundColor: n.depth === 0 ? colors.bgSoft : colors.white,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}>
            <View style={{ opacity: n.isGroup ? 1 : 0 }}>
              <Icon name="chevron" size={14} color={colors.muted} strokeWidth={2.6} rotate={isOpen ? 90 : 0} />
            </View>
            <Txt mono size={11} color={colors.muted} style={{ width: 52 }}>
              {n.account.code}
            </Txt>
            <Txt size={14} w={n.depth === 0 ? 700 : n.isGroup ? 600 : n.account.partyType ? 400 : 500} numberOfLines={1} style={{ flex: 1 }}>
              {n.account.name}
            </Txt>
            <Txt size={13} w={600} tabular>
              {fmtParen(n.balance)}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}
