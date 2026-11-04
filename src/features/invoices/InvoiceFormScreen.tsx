import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { BottomSheetList, useSheet, type SheetItem } from '@/components/ui/BottomSheet';
import { FormFooter, PillButton, PrimaryButton } from '@/components/ui/Buttons';
import { ErrorBanner } from '@/components/ui/Feedback';
import { InlineNumberInput, PickerField, QtyStepper } from '@/components/ui/Fields';
import { ScreenHeader } from '@/components/ui/Headers';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { db } from '@/db/client';
import { useNextNumber, useParties, useProducts } from '@/db/hooks';
import { getWalkInCustomerId } from '@/db/queries/parties';
import { INVOICE_KINDS, type InvoiceKind } from '@/db/schema';
import { errorMessages } from '@/db/services/errors';
import { buildReturnDraft, isOutflowKind, saveInvoice } from '@/db/services/invoices';
import { today } from '@/lib/dates';
import { dateLabel, fmt, initials } from '@/lib/format';
import { paisaToInput, toPaisa } from '@/lib/money';
import { QuickAddSheet } from '@/features/parties/QuickAddSheet';
import { INVOICE_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { toast } from '@/store/ui';
import { colors, tints } from '@/theme/tokens';

type DraftLine = { productId: string; qty: number; rate: string };
type Draft = { partyId: string | null; lines: DraftLine[]; discount: string; paid: string; sourceInvoiceId: string | null };

function initialDraft(kind: InvoiceKind, partyId?: string, sourceInvoiceId?: string): Draft {
  if (sourceInvoiceId) {
    const r = buildReturnDraft(db, sourceInvoiceId);
    return { partyId: r.partyId, lines: r.lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: paisaToInput(l.rate) })), discount: '', paid: '', sourceInvoiceId };
  }
  return { partyId: partyId ?? (kind === 'SI' ? getWalkInCustomerId() : null), lines: [], discount: '', paid: '', sourceInvoiceId: null };
}

export function InvoiceFormScreen() {
  const params = useLocalSearchParams<{ kind?: string; partyId?: string; sourceInvoiceId?: string }>();
  const kind: InvoiceKind = (INVOICE_KINDS as readonly string[]).includes(params.kind ?? '') ? (params.kind as InvoiceKind) : 'SI';
  const K = INVOICE_META[kind];
  const selling = kind === 'SI' || kind === 'SR';

  const [draft, setDraft] = useState<Draft>(() => initialDraft(kind, params.partyId, params.sourceInvoiceId));
  const [errors, setErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const partySheet = useSheet();
  const productSheet = useSheet();

  const number = useNextNumber(kind).data ?? '';
  const parties = useParties(K.party).data ?? [];
  const products = useProducts().data ?? [];
  const productById = new Map(products.map((p) => [p.id, p]));
  const party = parties.find((p) => p.id === draft.partyId);

  const update = (fn: (d: Draft) => Draft) => {
    setDraft(fn);
    setErrors([]);
  };
  const setLine = (i: number, patch: Partial<DraftLine>) => update((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addProduct = (productId: string) =>
    update((d) => {
      const i = d.lines.findIndex((l) => l.productId === productId);
      if (i >= 0) return { ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l)) };
      const p = productById.get(productId)!;
      return { ...d, lines: [...d.lines, { productId, qty: 1, rate: paisaToInput(selling ? p.salePrice : p.costPrice) }] };
    });

  const subtotal = draft.lines.reduce((s, l) => s + l.qty * toPaisa(l.rate), 0);
  const total = Math.max(0, subtotal - toPaisa(draft.discount));
  const paid = Math.min(toPaisa(draft.paid), total);
  const due = total - paid;
  const pn = party?.name ?? `the ${K.party}`;
  const hint = !party
    ? `Pick a ${K.party} to continue.`
    : kind === 'SI'
      ? due > 0
        ? `${fmt(due)} will be added to what ${pn} owes you.`
        : 'Fully paid. Cash goes into your cash book.'
      : kind === 'PI'
        ? due > 0
          ? `${fmt(due)} will be added to what you owe ${pn}.`
          : 'Fully paid from cash.'
        : kind === 'SR'
          ? `Items go back into stock. ${due > 0 ? `${fmt(due)} is taken off what ${pn} owes you.` : 'Refund paid from cash.'}`
          : `Items leave your stock. ${due > 0 ? `${fmt(due)} is taken off what you owe ${pn}.` : 'Refund received in cash.'}`;

  const save = () => {
    try {
      const r = saveInvoice({
        kind,
        date: today(),
        partyId: draft.partyId,
        lines: draft.lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: toPaisa(l.rate) })),
        discount: toPaisa(draft.discount),
        paid: toPaisa(draft.paid),
        sourceInvoiceId: draft.sourceInvoiceId,
      });
      toast(`${r.number} saved · stock and accounts updated`);
      nav.invoice(r.id, { replace: true });
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  const partyItems: SheetItem[] = [
    { type: 'item', key: 'add', badge: '+', badgeBg: colors.ink, badgeFg: colors.white, title: `Add new ${K.party}`, sub: 'Create and select', onPress: () => (partySheet.hide(), setAdding(true)) },
    ...parties
      .filter((p) => !partySheet.search || p.name.toLowerCase().includes(partySheet.search.toLowerCase()))
      .map<SheetItem>((p) => ({
        type: 'item',
        key: p.id,
        badge: initials(p.name),
        badgeBg: K.light,
        badgeFg: K.color,
        title: p.name,
        sub: p.phone ?? undefined,
        right: p.balance > 0 ? fmt(p.balance) : undefined,
        rightSub: p.balance > 0 ? (K.party === 'customer' ? 'owes you' : 'you owe') : undefined,
        rightSubColor: K.color,
        selected: p.id === draft.partyId,
        onPress: () => {
          update((d) => ({ ...d, partyId: p.id }));
          partySheet.hide();
        },
      })),
  ];

  const productItems: SheetItem[] = products
    .filter((p) => !productSheet.search || `${p.name} ${p.sku}`.toLowerCase().includes(productSheet.search.toLowerCase()))
    .map((p) => {
      const inDraft = draft.lines.find((l) => l.productId === p.id);
      return {
        type: 'item',
        key: p.id,
        badge: inDraft ? `×${inDraft.qty}` : initials(p.brandName),
        badgeBg: inDraft ? K.color : tints[p.categoryIndex % tints.length],
        badgeFg: inDraft ? colors.white : colors.ink,
        title: p.name,
        sub: `${p.brandName} · ${p.stock} in stock`,
        right: fmt(selling ? p.salePrice : p.costPrice),
        rightSub: selling ? 'sale price' : 'cost',
        rightSubColor: p.isLow ? colors.dangerStrong : colors.muted,
        selected: !!inDraft,
        onPress: () => addProduct(p.id),
      };
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader kicker={`${number} · Today, ${dateLabel(today())}`} title={`New ${K.title}`} color={K.color}>
        <PickerField
          label={K.party === 'customer' ? 'Customer' : 'Supplier'}
          value={party?.name ?? `Choose ${K.party}`}
          initials={party ? initials(party.name) : '+'}
          color={K.color}
          light={K.light}
          onPress={() => partySheet.show(true)}
          style={{ marginTop: 14 }}
        />
      </ScreenHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 4, marginBottom: 10 }}>
          <Txt display={700} size={17}>
            Items{' '}
            <Txt display={600} size={17} color={colors.muted}>
              {draft.lines.length || ''}
            </Txt>
          </Txt>
          <PillButton label="Add product" onPress={() => productSheet.show(true)} />
        </View>

        {draft.lines.length === 0 ? (
          <Tap onPress={() => productSheet.show(true)} style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: colors.lineDashed, borderRadius: 20, paddingVertical: 28, paddingHorizontal: 16 }}>
            <Txt size={14} color={colors.muted} align="center">
              No items yet. Tap to pick products from your catalogue.
            </Txt>
          </Tap>
        ) : null}

        <View style={{ gap: 8 }}>
          {draft.lines.map((l, i) => {
            const p = productById.get(l.productId);
            const stock = p?.stock ?? 0;
            const warn = isOutflowKind(kind) && l.qty > stock;
            return (
              <View key={l.productId} style={{ backgroundColor: colors.white, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={14.5} w={600}>
                      {p?.name ?? '—'}
                    </Txt>
                    <Txt size={12} color={warn ? colors.dangerStrong : colors.muted} style={{ marginTop: 1 }}>
                      {warn ? `Only ${stock} in stock` : `${stock} in stock`}
                    </Txt>
                  </View>
                  <Tap accessibilityLabel={`Remove ${p?.name ?? 'item'}`} hitSlop={10} onPress={() => update((d) => ({ ...d, lines: d.lines.filter((_, j) => j !== i) }))} style={{ padding: 2 }}>
                    <Icon name="trash" size={18} color={colors.faint} />
                  </Tap>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <QtyStepper value={l.qty} onChange={(qty) => setLine(i, { qty })} />
                  <Txt size={13} color={colors.muted}>
                    ×
                  </Txt>
                  <InlineNumberInput value={l.rate} onChangeText={(rate) => setLine(i, { rate })} width={84} height={38} align="left" accessibilityLabel="Rate" />
                  <Txt display={700} size={15} tabular align="right" style={{ flex: 1 }} numberOfLines={1}>
                    {fmt(l.qty * toPaisa(l.rate))}
                  </Txt>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ backgroundColor: colors.white, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16, marginTop: 14 }}>
          <Line label="Subtotal">
            <Txt size={14} w={600} tabular>
              {fmt(subtotal)}
            </Txt>
          </Line>
          <Line label="Discount" divider>
            <InlineNumberInput value={draft.discount} onChangeText={(discount) => update((d) => ({ ...d, discount }))} accessibilityLabel="Discount" />
          </Line>
          <Line label="Total" divider strong>
            <Txt display={800} size={22} tabular>
              {fmt(total)}
            </Txt>
          </Line>
          <Line label={K.paidLabel} divider>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tap onPress={() => update((d) => ({ ...d, paid: paisaToInput(total) }))} style={{ borderRadius: 99, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: K.light }}>
                <Txt size={12} w={700} color={K.color}>
                  Full
                </Txt>
              </Tap>
              <InlineNumberInput value={draft.paid} onChangeText={(p) => update((d) => ({ ...d, paid: p }))} accessibilityLabel={K.paidLabel} />
            </View>
          </Line>
          <Line label={K.dueLabel} divider strongLabel>
            <Txt size={14} w={700} color={due > 0 ? K.color : colors.muted} tabular>
              {fmt(due)}
            </Txt>
          </Line>
        </View>
        <Txt size={13} lh={19} color={colors.muted} style={{ marginTop: 12, marginHorizontal: 6 }}>
          {hint}
        </Txt>
        <ErrorBanner messages={errors} />
      </ScrollView>

      <FormFooter>
        <PrimaryButton label={`Save ${K.short} · ${fmt(total)}`} onPress={save} bg={K.color} />
      </FormFooter>

      <BottomSheetList
        visible={partySheet.visible}
        onClose={partySheet.hide}
        title={`Choose ${K.party}`}
        items={partyItems}
        search={partySheet.search}
        onSearch={partySheet.setSearch}
      />
      <BottomSheetList
        visible={productSheet.visible}
        onClose={productSheet.hide}
        title="Add products"
        closeLabel="Done"
        items={productItems}
        search={productSheet.search}
        onSearch={productSheet.setSearch}
      />
      <QuickAddSheet type={adding ? K.party : null} onClose={() => setAdding(false)} onCreated={(id) => update((d) => ({ ...d, partyId: id }))} />
    </KeyboardAvoidingView>
  );
}

function Line({ label, children, divider, strong, strongLabel }: { label: string; children: React.ReactNode; divider?: boolean; strong?: boolean; strongLabel?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        paddingVertical: strong || strongLabel ? 12 : 8,
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.line,
      }}>
      <Txt size={strong ? 15 : 14} w={strong ? 700 : strongLabel ? 600 : 400} color={strong || strongLabel ? colors.ink : colors.muted} style={{ flex: 1 }}>
        {label}
      </Txt>
      {children}
    </View>
  );
}
