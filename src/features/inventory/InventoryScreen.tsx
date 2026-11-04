import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { View } from 'react-native';

import { Fab } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/Feedback';
import { FilterChips } from '@/components/ui/FilterChips';
import { HeaderStats, ModuleHeader } from '@/components/ui/Headers';
import { ListRow, ProductRow } from '@/components/ui/Rows';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useCategories, useGroups, useProducts } from '@/db/hooks';
import type { GroupRowData, ProductRowData } from '@/db/queries/products';
import { fmt, fmtQty, initials, plural } from '@/lib/format';
import { QuickAddSheet } from '@/features/parties/QuickAddSheet';
import { nav } from '@/features/shared/navigation';
import { useUi, type InventorySeg } from '@/store/ui';
import { colors, tints } from '@/theme/tokens';

type Row = { type: 'product'; p: ProductRowData } | { type: 'group'; g: GroupRowData };

export function InventoryScreen() {
  const seg = useUi((s) => s.inventorySeg);
  const setSeg = useUi((s) => s.setInventorySeg);
  const category = useUi((s) => s.inventoryCategory);
  const q = useUi((s) => s.inventorySearch);
  const setFilter = useUi((s) => s.setInventoryFilter);
  const [adding, setAdding] = useState<'category' | 'brand' | null>(null);

  const all = useProducts().data ?? [];
  const products = useProducts({ categoryId: category, search: q }).data ?? [];
  const categories = useCategories().data ?? [];
  const groups = useGroups(seg === 'brands' ? 'brand' : 'category', seg === 'products' ? '' : q).data ?? [];

  const value = all.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const low = all.filter((p) => p.isLow).length;

  const rows: Row[] = seg === 'products' ? products.map((p) => ({ type: 'product', p })) : groups.map((g) => ({ type: 'group', g }));

  const openGroup = (g: GroupRowData) => {
    setSeg('products');
    if (seg === 'categories') setFilter({ category: g.id, search: '' });
    else setFilter({ category: null, search: g.name });
  };

  const header = (
    <View>
      <ModuleHeader title="Inventory" right={plural(all.length, 'product')} color={colors.inventory} fg={colors.ink}>
        <HeaderStats
          fg={colors.ink}
          tileBg={colors.onColor35}
          items={[
            { label: 'Stock value (at cost)', value: fmt(value) },
            { label: 'Running low', value: plural(low, 'item') },
          ]}
        />
        <View style={{ marginTop: 14 }}>
          <SegmentedControl<InventorySeg>
            value={seg}
            onChange={(s) => {
              setSeg(s);
              setFilter({ search: '' });
            }}
            trackColor={colors.inkShade12}
            activeColor={colors.ink}
            inactiveText={colors.ink}
            options={[
              { value: 'products', label: 'Products' },
              { value: 'categories', label: 'Categories' },
              { value: 'brands', label: 'Brands' },
            ]}
          />
        </View>
      </ModuleHeader>
      <SearchField value={q} onChangeText={(s) => setFilter({ search: s })} style={{ marginTop: 14, marginBottom: 10, marginHorizontal: 16 }} />
      {seg === 'products' ? (
        <FilterChips
          chips={[{ value: null, label: 'All' }, ...categories.map((c) => ({ value: c.id as string | null, label: c.name }))]}
          value={category}
          onChange={(c) => setFilter({ category: c })}
          style={{ marginBottom: 10 }}
        />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlashList
        data={rows}
        keyExtractor={(r) => (r.type === 'product' ? r.p.id : r.g.id)}
        getItemType={(r) => r.type}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState text={seg === 'products' ? 'No products match' : 'Nothing here yet'} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            {item.type === 'product' ? (
              <ProductRow
                initials={initials(item.p.brandName)}
                tintIndex={item.p.categoryIndex}
                name={item.p.name}
                sub={`${item.p.brandName} · ${item.p.categoryName}`}
                price={fmt(item.p.salePrice)}
                stock={`${fmtQty(item.p.stock)} in stock`}
                low={item.p.isLow}
                onPress={() => nav.product(item.p.id)}
              />
            ) : (
              <ListRow
                badge={initials(item.g.name)}
                badgeBg={tints[item.g.index % tints.length]}
                badgeFg={colors.ink}
                title={item.g.name}
                sub={`${plural(item.g.productCount, 'product')} · ${fmtQty(item.g.pcs)} pcs`}
                right={fmt(item.g.value)}
                rightSub="stock value"
                onPress={() => openGroup(item.g)}
              />
            )}
          </View>
        )}
      />
      <Fab
        label={seg === 'products' ? 'Add product' : seg === 'categories' ? 'Add category' : 'Add brand'}
        onPress={() => (seg === 'products' ? nav.product() : setAdding(seg === 'categories' ? 'category' : 'brand'))}
      />
      <QuickAddSheet type={adding} onClose={() => setAdding(null)} />
    </View>
  );
}
