/**
 * Design tokens taken from the prototype (`docs/design/Accounts Inventory App.dc.html`).
 * Every colour, radius and spacing value used by screens should come from here.
 */
export const colors = {
  ink: '#17161c',
  muted: '#6b6874',
  faint: '#a19ea8',
  tabIdle: '#8a8790',
  bg: '#f4f1ea',
  bgSoft: '#faf8f4',
  card: '#ffffff',
  white: '#ffffff',
  neutralPill: '#eeebe4',
  neutralChip: '#ece8df',
  neutralText: '#3d3b44',

  line: 'rgba(23,22,28,0.06)',
  lineStrong: 'rgba(23,22,28,0.10)',
  lineDashed: 'rgba(23,22,28,0.15)',
  backdrop: 'rgba(23,22,28,0.45)',

  sales: '#0b8049',
  salesLight: '#d7f2e3',
  salesDark: '#0b5c35',
  purchase: '#2a5fd6',
  purchaseLight: '#dfe7fc',
  inventory: '#f0a020',
  inventoryDark: '#9a6200',
  inventoryLight: '#fdecc8',
  stockLedger: '#7a4d00',
  accounts: '#6d3fd6',
  accountsLight: '#ebe3fc',
  report: '#d9472b',
  reportLight: '#fde0d8',
  danger: '#9e2a14',
  dangerStrong: '#b3301a',

  onColor15: 'rgba(255,255,255,0.15)',
  onColor20: 'rgba(255,255,255,0.20)',
  onColor35: 'rgba(255,255,255,0.35)',
  onColor40: 'rgba(255,255,255,0.40)',
  shade20: 'rgba(0,0,0,0.20)',
  inkShade12: 'rgba(23,22,28,0.12)',
} as const;

/** Category / brand tile tints, cycled by index. */
export const tints = ['#d7f2e3', '#dfe7fc', '#fdecc8', '#ebe3fc', '#fde0d8', '#e2efe9'] as const;

export const radii = {
  input: 14,
  inputSm: 12,
  badge: 14,
  card: 18,
  cardLg: 22,
  tile: 24,
  header: 32,
  headerPushed: 28,
  sheet: 28,
  pill: 99,
} as const;

export const spacing = {
  screen: 16,
  card: 14,
  gap: 8,
  headerTop: 12,
} as const;

export const sizes = {
  tabBar: 84,
  input: 50,
  inputInline: 38,
  button: 54,
  fab: 54,
  backButton: 40,
  hit: 44,
} as const;

export const shadow = {
  fab: {
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
} as const;

/** Each tab / module owns a colour (PRD §3.1 module colour rule). */
export type ModuleKey = 'home' | 'sales' | 'purchase' | 'inventory' | 'accounts' | 'report';

export const moduleColors: Record<ModuleKey, { color: string; light: string; onColor: string }> = {
  home: { color: colors.ink, light: colors.neutralChip, onColor: colors.white },
  sales: { color: colors.sales, light: colors.salesLight, onColor: colors.white },
  purchase: { color: colors.purchase, light: colors.purchaseLight, onColor: colors.white },
  inventory: { color: colors.inventory, light: colors.inventoryLight, onColor: colors.ink },
  accounts: { color: colors.accounts, light: colors.accountsLight, onColor: colors.white },
  report: { color: colors.report, light: colors.reportLight, onColor: colors.white },
};
