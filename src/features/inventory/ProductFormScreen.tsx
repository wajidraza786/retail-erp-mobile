import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, FormFooter, PrimaryButton } from '@/components/ui/Buttons';
import { ErrorBanner, Loading } from '@/components/ui/Feedback';
import { FieldLabel, TextField } from '@/components/ui/Fields';
import { ScreenHeader } from '@/components/ui/Headers';
import { Tap } from '@/components/ui/Tap';
import { Txt } from '@/components/ui/Txt';
import { useBrands, useCategories, useProduct } from '@/db/hooks';
import { errorMessages } from '@/db/services/errors';
import { saveProduct } from '@/db/services/products';
import { fmtSigned } from '@/lib/format';
import { paisaToInput, toPaisa, toQty } from '@/lib/money';
import { QuickAddSheet } from '@/features/parties/QuickAddSheet';
import { nav } from '@/features/shared/navigation';
import { toast } from '@/store/ui';
import { colors } from '@/theme/tokens';

type Draft = { name: string; sku: string; categoryId: string | null; brandId: string | null; cost: string; price: string; opening: string; reorder: string };

const EMPTY: Draft = { name: '', sku: '', categoryId: null, brandId: null, cost: '', price: '', opening: '', reorder: '5' };

export function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const product = useProduct(id);
  const categories = useCategories();
  const brands = useBrands();
  if ((id && !product.data) || !categories.data || !brands.data) return <Loading />;

  const p = product.data;
  const initial: Draft = p
    ? {
        name: p.name,
        sku: p.sku,
        categoryId: p.categoryId,
        brandId: p.brandId,
        cost: paisaToInput(p.costPrice),
        price: paisaToInput(p.salePrice),
        opening: String(p.openingStock),
        reorder: String(p.reorderLevel),
      }
    : // New products default to the first category / brand, like the prototype.
      { ...EMPTY, categoryId: categories.data[0]?.id ?? null, brandId: brands.data[0]?.id ?? null };

  return <ProductForm key={id ?? 'new'} id={id} initial={initial} product={p ?? null} categories={categories.data} brands={brands.data} />;
}

function ProductForm({
  id,
  initial,
  product,
  categories,
  brands,
}: {
  id?: string;
  initial: Draft;
  product: { stock: number; soldThisMonth: number } | null;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}) {
  const isEdit = !!id;
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [adding, setAdding] = useState<'category' | 'brand' | null>(null);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors([]);
  };

  const cost = toPaisa(draft.cost);
  const price = toPaisa(draft.price);
  const margin = price - cost;
  const pct = price > 0 ? Math.round((margin / price) * 100) : 0;

  const save = () => {
    try {
      saveProduct({
        id: id ?? null,
        name: draft.name,
        sku: draft.sku,
        categoryId: draft.categoryId,
        brandId: draft.brandId,
        costPrice: cost,
        salePrice: price,
        openingStock: toQty(draft.opening),
        reorderLevel: toQty(draft.reorder),
      });
      toast(isEdit ? 'Product updated' : `${draft.name.trim()} added to catalogue`);
      router.back();
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader kicker="Product catalogue" title={isEdit ? 'Edit product' : 'New product'} color={colors.inventory} fg={colors.ink}>
        {isEdit && product ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {[
                ['In stock now', `${product.stock} pcs`],
                ['Sold this month', `${product.soldThisMonth} pcs`],
              ].map(([l, v]) => (
                <View key={l} style={{ flex: 1, backgroundColor: colors.onColor40, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 }}>
                  <Txt size={11} w={600}>
                    {l}
                  </Txt>
                  <Txt display={800} size={20}>
                    {v}
                  </Txt>
                </View>
              ))}
            </View>
            <Button label="View stock ledger" height={42} radius={14} size={13.5} style={{ marginTop: 8 }} onPress={() => nav.report('stockledger', { productId: id })} />
          </>
        ) : null}
      </ScreenHeader>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <TextField label="Product name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="e.g. Anker 30W Charger" autoCapitalize="words" />
        <TextField label="SKU / code" value={draft.sku} onChangeText={(sku) => set({ sku })} placeholder="e.g. ANK-30W" mono autoCapitalize="characters" />

        <ChipGroup
          label="Category"
          items={categories}
          value={draft.categoryId}
          onChange={(categoryId) => set({ categoryId })}
          onAdd={() => setAdding('category')}
        />
        <ChipGroup label="Brand" items={brands} value={draft.brandId} onChange={(brandId) => set({ brandId })} onAdd={() => setAdding('brand')} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextField label="Cost price (Rs)" value={draft.cost} onChangeText={(c) => set({ cost: c })} placeholder="0" keyboardType="decimal-pad" bold style={{ flex: 1 }} />
          <TextField label="Sale price (Rs)" value={draft.price} onChangeText={(p) => set({ price: p })} placeholder="0" keyboardType="decimal-pad" bold style={{ flex: 1 }} />
        </View>
        <View
          style={{
            backgroundColor: margin < 0 ? colors.reportLight : colors.salesLight,
            borderRadius: 14,
            paddingVertical: 11,
            paddingHorizontal: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
          <Txt size={13} w={600} color={margin < 0 ? colors.danger : colors.salesDark}>
            Profit per piece
          </Txt>
          <Txt size={13} w={600} color={margin < 0 ? colors.danger : colors.salesDark} tabular>
            {price && cost ? `${fmtSigned(margin)} · ${pct}%` : '—'}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextField
            label={isEdit ? 'Opening stock' : 'Stock you have now'}
            value={draft.opening}
            onChangeText={(o) => set({ opening: o })}
            placeholder="0"
            keyboardType="number-pad"
            bold
            editable={!isEdit}
            style={{ flex: 1 }}
          />
          <TextField label="Alert me below" value={draft.reorder} onChangeText={(r) => set({ reorder: r })} placeholder="0" keyboardType="number-pad" bold style={{ flex: 1 }} />
        </View>
        <ErrorBanner messages={errors} />
      </ScrollView>

      <FormFooter>
        <PrimaryButton label={isEdit ? 'Save changes' : 'Add to catalogue'} onPress={save} bg={colors.inventory} fg={colors.ink} />
      </FormFooter>

      <QuickAddSheet
        type={adding}
        onClose={() => setAdding(null)}
        onCreated={(newId) => set(adding === 'brand' ? { brandId: newId } : { categoryId: newId })}
      />
    </KeyboardAvoidingView>
  );
}

function ChipGroup({
  label,
  items,
  value,
  onChange,
  onAdd,
}: {
  label: string;
  items: { id: string; name: string }[];
  value: string | null;
  onChange: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((c) => {
          const active = c.id === value;
          return (
            <Tap
              key={c.id}
              onPress={() => onChange(c.id)}
              accessibilityState={{ selected: active }}
              style={{ borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: active ? colors.ink : colors.white }}>
              <Txt size={13} w={600} color={active ? colors.white : colors.ink}>
                {c.name}
              </Txt>
            </Tap>
          );
        })}
        <Tap onPress={onAdd} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(23,22,28,0.25)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Txt size={13} w={600} color={colors.muted}>
            + New
          </Txt>
        </Tap>
      </View>
    </View>
  );
}
