import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { listCategories } from '@/catalog/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { showToast } from '@/ui/toast';

import { browseCatalog, searchCatalog } from './catalog';
import type { CatalogItem } from './catalog-map';

/**
 * Selling without a barcode: type a name or code and tap the result, or tap an item from the shop's own list (most sold first),
 * narrowed by category. The camera is one optional button next to the search box.
 */
export function ItemPicker({ onPick, qtyOf, onCode, wholesale, branchId, scan }: { onPick: (item: CatalogItem) => void; qtyOf: (variantId: string) => number; onCode: (code: string) => void; wholesale: boolean; branchId?: string; scan?: { open: boolean; toggle: () => void } }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setTyped(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const categories = useQuery({ queryKey: ['sell', 'categories'], queryFn: () => listCategories(), staleTime: 10 * 60_000 });
  const list = useInfiniteQuery({
    queryKey: ['sell', 'items', typed, category, wholesale, branchId],
    queryFn: ({ pageParam }) => (typed ? searchCatalog({ q: typed, page: pageParam, wholesale }) : browseCatalog({ category, page: pageParam })),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    placeholderData: (prev) => prev,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  // The browse list holds only what is on the shelf; a search also finds finished items (marked), so "do we have it?" gets an answer.
  const isOut = (it: CatalogItem) => it.stock !== null && Number(it.stock) <= 0;

  /** Enter on a keyed code: one match is taken; no match and no spaces is tried as an exact barcode or SKU (so a typed or Bluetooth-scanned code still works). */
  function submit() {
    const q = text.trim();
    if (!q) return;
    if (items.length === 1) onPick(items[0]);
    else if (items.length === 0 && !/\s/.test(q)) onCode(q);
    setText('');
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Find an item" value={text} onChangeText={setText} placeholder="Name or code" autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={submit} />
        </View>
        {scan ? (
          <Tap accessibilityRole="button" accessibilityLabel={t(scan.open ? 'Stop the camera' : 'Scan a barcode')} onPress={scan.toggle} style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: scan.open ? theme.brand : theme.card, borderWidth: 1, borderColor: scan.open ? theme.brand : theme.inputBorder }}>
            <Icon name="ScanLine" size={22} color={scan.open ? theme.onBrand : theme.brand} />
          </Tap>
        ) : null}
      </View>

      {typed ? null : (categories.data?.length ?? 0) > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {[{ id: null as string | null, name: t('All') }, ...(categories.data ?? [])].map((c) => {
            const on = category === c.id;
            return (
              <Tap key={c.id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(c.id)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
                <ThemedText type="smallMedium" literal style={{ color: on ? theme.brandText : theme.textSecondary }}>
                  {c.name}
                </ThemedText>
              </Tap>
            );
          })}
        </ScrollView>
      ) : null}

      {list.isError ? <ErrorState message={t('Could not load items.')} onRetry={() => void list.refetch()} /> : null}
      {list.isPending ? <SkeletonRows count={3} /> : null}
      {!list.isPending && !list.isError && items.length === 0 ? (
        typed ? (
          <EmptyState icon="Search" title="Nothing matches that" hint="Check the spelling, or try the first letters of the name." />
        ) : (
          <EmptyState icon="Package" title="No items yet" hint="Add your first item and it will show up here." />
        )
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {items.map((it) => {
          const n = qtyOf(it.variantId);
          const out = isOut(it);
          return (
            <Tap
              key={it.variantId}
              accessibilityRole="button"
              accessibilityLabel={`${it.name}, ${formatBDT(it.price)}${n > 0 ? `, ${t('{n} in the cart', { n })}` : ''}`}
              onPress={() => (out ? showToast({ text: t('This item is finished.') }) : onPick(it))}
              style={{ flexBasis: '48%', flexGrow: 1, minHeight: 76, padding: Spacing.three, gap: 4, borderRadius: Radius.lg, borderCurve: 'continuous', opacity: out ? 0.55 : 1, backgroundColor: n > 0 ? theme.successSoft : theme.card, borderWidth: n > 0 ? 2 : 1, borderColor: n > 0 ? theme.positive : theme.border }}>
              <ThemedText type="smallMedium" numberOfLines={2} literal>
                {it.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {formatBDT(it.price, { dp: 0 })}
                {it.allowDecimal && it.unitShort ? ` / ${it.unitShort}` : ''}
                {out ? ` · ${t('Finished')}` : ''}
              </ThemedText>
              {n > 0 ? (
                <View style={{ position: 'absolute', top: -8, right: -6, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.go }}>
                  <ThemedText type="caption" style={{ color: theme.onBrand }}>
                    {n}
                  </ThemedText>
                </View>
              ) : null}
            </Tap>
          );
        })}
      </View>
      {list.hasNextPage ? <Button title="Show more" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
    </View>
  );
}
