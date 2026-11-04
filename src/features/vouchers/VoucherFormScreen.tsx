import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { useSheet } from '@/components/ui/BottomSheet';
import { FormFooter, PrimaryButton } from '@/components/ui/Buttons';
import { ErrorBanner } from '@/components/ui/Feedback';
import { PickerField, TextField } from '@/components/ui/Fields';
import { ScreenHeader } from '@/components/ui/Headers';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { db } from '@/db/client';
import { useNextNumber } from '@/db/hooks';
import { VOUCHER_KINDS, type VoucherKind } from '@/db/schema';
import { getAccount } from '@/db/services/accounts';
import { errorMessages } from '@/db/services/errors';
import { saveVoucher } from '@/db/services/vouchers';
import { today } from '@/lib/dates';
import { dateLabel, fmt, initials } from '@/lib/format';
import { toPaisa } from '@/lib/money';
import { VOUCHER_META } from '@/features/shared/meta';
import { nav } from '@/features/shared/navigation';
import { toast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { AccountPicker, type PickedAccount } from './AccountPicker';

type JvLine = { account: PickedAccount | null; dr: string; cr: string };
const blankLine = (): JvLine => ({ account: null, dr: '', cr: '' });

export function VoucherFormScreen() {
  const params = useLocalSearchParams<{ kind?: string; accountId?: string; amount?: string }>();
  const kind: VoucherKind = (VOUCHER_KINDS as readonly string[]).includes(params.kind ?? '') ? (params.kind as VoucherKind) : 'CRV';
  const K = VOUCHER_META[kind];
  const isJV = kind === 'JV';

  const [account, setAccount] = useState<PickedAccount | null>(() => {
    const a = params.accountId ? getAccount(db, params.accountId) : undefined;
    return a ? { id: a.id, name: a.name, code: a.code } : null;
  });
  const [amount, setAmount] = useState(params.amount ?? '');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<JvLine[]>([blankLine(), blankLine()]);
  const [errors, setErrors] = useState<string[]>([]);
  const picker = useSheet<{ target: 'single' } | { target: 'line'; index: number }>();

  const number = useNextNumber(kind).data ?? '';
  const amt = toPaisa(amount);
  const dt = lines.reduce((s, l) => s + toPaisa(l.dr), 0);
  const ct = lines.reduce((s, l) => s + toPaisa(l.cr), 0);
  const balanced = dt > 0 && dt === ct;

  const setLine = (i: number, patch: Partial<JvLine>) => {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    setErrors([]);
  };
  const removeLine = (i: number) => setLines((ls) => (ls.length > 2 ? ls.filter((_, j) => j !== i) : ls.map((l, j) => (j === i ? blankLine() : l))));

  const save = () => {
    try {
      const r = saveVoucher(
        isJV
          ? { kind, date: today(), narration, lines: lines.map((l) => ({ accountId: l.account?.id ?? null, debit: toPaisa(l.dr), credit: toPaisa(l.cr) })) }
          : { kind, date: today(), narration, accountId: account?.id ?? null, amount: amt },
      );
      toast(`${r.number} posted to the books`);
      nav.voucher(r.id, { replace: true });
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  const preview =
    kind === 'CRV'
      ? [
          { side: 'Dr', c: colors.sales, name: 'Cash in Hand' },
          { side: 'Cr', c: colors.report, name: account?.name ?? '—' },
        ]
      : [
          { side: 'Dr', c: colors.sales, name: account?.name ?? '—' },
          { side: 'Cr', c: colors.report, name: 'Cash in Hand' },
        ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader kicker={`${number} · Today, ${dateLabel(today())}`} title={K.title} color={K.color}>
        <Txt size={13} color={colors.white} style={{ marginTop: 10, paddingLeft: 52 }}>
          {K.desc}
        </Txt>
      </ScreenHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {!isJV ? (
          <>
            <View style={{ backgroundColor: colors.white, borderRadius: 22, padding: 18, alignItems: 'center' }}>
              <Txt size={12} w={600} color={colors.muted}>
                Amount
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <Txt display={700} size={22} color={colors.muted}>
                  Rs
                </Txt>
                <TextInput
                  value={amount}
                  onChangeText={(s) => (setAmount(s), setErrors([]))}
                  placeholder="0"
                  placeholderTextColor={colors.faint}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Amount"
                  style={{ minWidth: 120, maxWidth: 220, fontFamily: fonts.display800, fontSize: 42, color: colors.ink, paddingVertical: 0 }}
                />
              </View>
            </View>
            <PickerField
              label={K.acctLabel}
              value={account?.name ?? 'Choose account'}
              initials={account ? initials(account.name) : '+'}
              color={K.color}
              light={K.light}
              onPress={() => picker.show({ target: 'single' })}
              style={{ marginTop: 10, paddingVertical: 13 }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 8 }}>
              {lines.map((l, i) => (
                <View key={i} style={{ backgroundColor: colors.white, borderRadius: 18, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Tap onPress={() => picker.show({ target: 'line', index: i })} style={{ flex: 1, minWidth: 0, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 }}>
                      <Txt size={11} color={colors.muted}>
                        Line {i + 1} · account
                      </Txt>
                      <Txt size={14} w={600} numberOfLines={1}>
                        {l.account?.name ?? 'Choose account'}
                      </Txt>
                    </Tap>
                    <Tap accessibilityLabel={`Remove line ${i + 1}`} hitSlop={8} onPress={() => removeLine(i)} style={{ padding: 4 }}>
                      <Icon name="close" size={18} color={colors.faint} />
                    </Tap>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextField label="Debit" height={42} value={l.dr} onChangeText={(dr) => setLine(i, { dr })} placeholder="0" keyboardType="decimal-pad" bold style={{ flex: 1 }} />
                    <TextField label="Credit" height={42} value={l.cr} onChangeText={(cr) => setLine(i, { cr })} placeholder="0" keyboardType="decimal-pad" bold style={{ flex: 1 }} />
                  </View>
                </View>
              ))}
            </View>
            <Tap
              onPress={() => setLines((ls) => [...ls, blankLine()])}
              style={{ marginTop: 8, height: 46, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(23,22,28,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={14} w={700}>
                + Add line
              </Txt>
            </Tap>
            <View style={{ marginTop: 10, backgroundColor: balanced ? colors.salesLight : colors.neutralChip, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={13} w={600} color={balanced ? colors.salesDark : colors.ink} tabular>
                  Debit {fmt(dt)}
                </Txt>
                <Txt size={13} w={600} color={balanced ? colors.salesDark : colors.ink} tabular>
                  Credit {fmt(ct)}
                </Txt>
              </View>
              <Txt size={14} w={700} color={balanced ? colors.salesDark : colors.ink} style={{ marginTop: 4 }}>
                {balanced ? 'Balanced, ready to save' : dt + ct === 0 ? 'Enter debit and credit amounts' : `Off by ${fmt(dt - ct)}`}
              </Txt>
            </View>
          </>
        )}

        <TextField label="Narration" value={narration} onChangeText={setNarration} placeholder="What is this for?" style={{ marginTop: 10 }} autoCapitalize="sentences" />

        {!isJV ? (
          <View style={{ marginTop: 14, borderWidth: 1.5, borderColor: 'rgba(23,22,28,0.08)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Txt size={12} w={700} color={colors.muted} style={{ marginBottom: 8 }}>
              How this is recorded
            </Txt>
            {preview.map((p) => (
              <View key={p.side} style={{ flexDirection: 'row', gap: 10, paddingVertical: 3 }}>
                <Txt mono={600} size={11} color={p.c} style={{ width: 22 }}>
                  {p.side}
                </Txt>
                <Txt size={13} style={{ flex: 1 }} numberOfLines={1}>
                  {p.name}
                </Txt>
                <Txt size={13} w={600} tabular>
                  {fmt(amt)}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}
        <ErrorBanner messages={errors} />
      </ScrollView>

      <FormFooter>
        <PrimaryButton label="Save voucher" onPress={save} bg={K.color} />
      </FormFooter>

      <AccountPicker
        visible={picker.visible}
        mode={isJV ? 'JV' : kind}
        search={picker.search}
        onSearch={picker.setSearch}
        onClose={picker.hide}
        selectedId={picker.open?.target === 'line' ? lines[picker.open.index]?.account?.id : account?.id}
        onPick={(a) => {
          const target = picker.open;
          if (target?.target === 'line') setLine(target.index, { account: a });
          else setAccount(a);
          setErrors([]);
          picker.hide();
        }}
      />
    </KeyboardAvoidingView>
  );
}
