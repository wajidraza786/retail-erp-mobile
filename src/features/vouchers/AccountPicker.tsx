import { BottomSheetList, type SheetItem } from '@/components/ui/BottomSheet';
import { useAccountTree } from '@/db/hooks';
import type { CoaNode } from '@/db/queries/accounts';
import type { Account } from '@/db/schema';
import type { SystemKey } from '@/db/services/ledger';
import { fmtParen } from '@/lib/format';
import { colors } from '@/theme/tokens';

export type PickerMode = 'CRV' | 'CPV' | 'JV';
export type PickedAccount = { id: string; name: string; code: string };

type Leaf = { account: Account; balance: number };

function leaves(nodes: CoaNode[]): Leaf[] {
  return nodes.flatMap((n) => (n.children.length ? leaves(n.children) : n.isGroup ? [] : [{ account: n.account, balance: n.balance }]));
}

/**
 * Accounts grouped by relevance (PRD §7.9):
 * CRV → Customers, Income, Other · CPV → Suppliers, Expenses, Other · JV → everything.
 */
export function AccountPicker({
  visible,
  mode,
  search,
  onSearch,
  onClose,
  onPick,
  selectedId,
}: {
  visible: boolean;
  mode: PickerMode;
  search: string;
  onSearch: (s: string) => void;
  onClose: () => void;
  onPick: (a: PickedAccount) => void;
  selectedId?: string | null;
}) {
  const all = leaves(useAccountTree().data ?? []);

  const byKey = (...keys: SystemKey[]) => keys.map((k) => all.find((l) => l.account.systemKey === k)).filter((l): l is Leaf => !!l);
  const customers = all.filter((l) => l.account.partyType === 'customer');
  const suppliers = all.filter((l) => l.account.partyType === 'supplier');
  const expenses = all.filter((l) => l.account.type === 'X' && l.account.systemKey !== 'cogs');

  const purple = [colors.accounts, colors.accountsLight] as const;
  const green = [colors.sales, colors.salesLight] as const;
  const blue = [colors.purchase, colors.purchaseLight] as const;
  const coral = [colors.report, colors.reportLight] as const;

  const sections: [string, Leaf[], readonly [string, string]][] =
    mode === 'CRV'
      ? [
          ['Customers', customers, green],
          ['Income', byKey('otherinc', 'sales'), coral],
          ['Other', byKey('bank', 'capital'), purple],
        ]
      : mode === 'CPV'
        ? [
            ['Suppliers', suppliers, blue],
            ['Expenses', expenses, coral],
            ['Other', byKey('bank', 'draw', 'furn'), purple],
          ]
        : [
            ['Assets', byKey('cash', 'bank', 'inv', 'furn'), green],
            ['Customers', customers, green],
            ['Suppliers', suppliers, blue],
            ['Equity', byKey('capital', 'draw'), purple],
            ['Income', byKey('sales', 'salesret', 'otherinc'), coral],
            ['Expenses', [...byKey('cogs'), ...expenses], coral],
          ];

  const q = search.trim().toLowerCase();
  const items: SheetItem[] = sections.flatMap(([label, list, [fg, bg]]) => {
    const matches = list.filter((l) => !q || `${l.account.name} ${l.account.code}`.toLowerCase().includes(q));
    if (!matches.length) return [];
    return [
      { type: 'header' as const, key: `h-${label}`, label },
      ...matches.map<SheetItem>((l) => ({
        type: 'item',
        key: `${label}-${l.account.id}`,
        badge: l.account.code.slice(-2),
        badgeBg: bg,
        badgeFg: fg,
        title: l.account.name,
        sub: l.account.code,
        right: fmtParen(l.balance),
        selected: l.account.id === selectedId,
        onPress: () => onPick({ id: l.account.id, name: l.account.name, code: l.account.code }),
      })),
    ];
  });

  return <BottomSheetList visible={visible} onClose={onClose} title="Choose account" items={items} search={search} onSearch={onSearch} />;
}
