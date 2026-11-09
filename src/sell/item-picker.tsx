import { looksLikeCode } from './code-input';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
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

import { browseCatalog, searchCatalog } from './catalog';
import type { CatalogItem } from './catalog-map';
import type { TabletLayout } from './tablet-layout';
import type { Favorite } from './use-favorite-products';

/**
 * Selling without a barcode: type a name or code and tap the result, or tap an item from the shop's own list (most sold first),
 * narrowed by category. The camera is one optional button next to the search box.
 */
export function ItemPicker({ onPick, onFewer, qtyOf, onCode, wholesale, branchId, scan, acceptKeyboardCode, subscribeToBroadcast, layout, favorites, favoritesBusy, onFavorite }: {
  onPick: (item: CatalogItem) => void;
  onFewer?: (item: CatalogItem) => void;
  qtyOf: (variantId: string) => number;
  onCode: (code: string) => void;
  wholesale: boolean;
  branchId?: string;
  scan?: { open: boolean; toggle: () => void; preview?: React.ReactNode };
  acceptKeyboardCode?: (code: string, willAct: boolean) => boolean;
  subscribeToBroadcast?: (listener: (code: string) => void) => () => void;
  layout?: TabletLayout;
  favorites: Favorite[];
  favoritesBusy: boolean;
  onFavorite: (item: CatalogItem) => void;
}) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [gridWidth, setGridWidth] = useState(0);
  const touch = layout === 'touch';
  const express = layout === 'express';
  const sheet = layout === 'sheet';
  const columns = gridWidth >= 660 && !touch ? 4 : gridWidth >= 500 ? 3 : 2;
  const tileWidth = layout && gridWidth > 0 ? Math.floor((gridWidth - Spacing.two * (columns - 1)) / columns) : undefined;
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  useEffect(() => subscribeToBroadcast?.((code) => {
    setText((current) => current.trim() === code ? '' : current);
  }), [subscribeToBroadcast]);
  const [category, setCategory] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setTyped(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const showCatalog = !sheet || !!typed;
  const catalogCategory = express || sheet ? null : category;
  const categories = useQuery({ queryKey: ['sell', 'categories'], queryFn: () => listCategories(), enabled: !express && !sheet, staleTime: 10 * 60_000 });
  const list = useInfiniteQuery({
    queryKey: ['sell', 'items', typed, catalogCategory, wholesale, branchId],
    queryFn: ({ pageParam }) => (typed ? searchCatalog({ q: typed, page: pageParam, wholesale }) : browseCatalog({ category: catalogCategory, page: pageParam })),
    initialPageParam: 1,
    enabled: showCatalog,
    getNextPageParam: (last) => last.nextPage,
    placeholderData: (prev) => prev,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  // The browse list holds only what is on the shelf; a search also finds finished items (marked), so "do we have it?" gets an answer.
  const isOut = (it: CatalogItem) => it.stock !== null && Number(it.stock) <= 0;

  /** Enter on what was typed: a code (barcode or SKU) is looked up exactly; with words, one match on screen is taken. */
  function submit(value: string) {
    const q = value.trim();
    if (!q) return;
    // A scanner's code plus Enter arrives before the search below has even started: look the code up exactly, now, not in the list on screen.
    const code = looksLikeCode(q);
    const match = typed === q && !list.isPlaceholderData && items.length === 1;
    const allowed = acceptKeyboardCode?.(q, code || match) !== false;
    if (allowed && !code && !match) return;
    if (allowed) {
      if (code) onCode(q);
      else onPick(items[0]);
    }
    setText('');
  }

  const filters = !typed && !express && !sheet && (categories.data?.length ?? 0) > 0 ? (
    [{ id: null as string | null, name: t('All') }, ...(categories.data ?? [])].map((c) => {
      const on = category === c.id;
      return (
        <Tap key={c.id ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(c.id)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: touch ? 12 : 18, borderRadius: touch ? Radius.md : Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
          <ThemedText type="smallMedium" literal numberOfLines={2} style={{ color: on ? theme.brandText : theme.textSecondary }}>{c.name}</ThemedText>
        </Tap>
      );
    })
  ) : null;

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label={express ? "Scan or enter a code" : "Find an item"} value={text} disableFullscreenUI onChangeText={setText} placeholder="Name or code" autoCapitalize="none" autoCorrect={false} returnKeyType="search" submitBehavior="submit" onSubmitEditing={(event) => submit(event.nativeEvent.text)} />
        </View>
        {scan ? (
          <Tap accessibilityRole="button" accessibilityLabel={t(scan.open ? 'Stop the camera' : 'Scan a barcode')} onPress={scan.toggle} style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: scan.open ? theme.brand : theme.card, borderWidth: 1, borderColor: scan.open ? theme.brand : theme.inputBorder }}>
            <Icon name="ScanLine" size={22} color={scan.open ? theme.onBrand : theme.brand} />
          </Tap>
        ) : null}
      </View>

      {scan?.preview}
      {filters && !touch ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>{filters}</ScrollView>
      ) : null}
      {showCatalog ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {filters && touch ? <View style={{ width: 108, gap: 6 }}>{filters}</View> : null}
          <View style={{ flex: 1, gap: Spacing.two }}>
            {express && !typed ? <ThemedText type="smallMedium">Quick products</ThemedText> : null}
            {list.isError ? <ErrorState message={t('Could not load items.')} onRetry={() => void list.refetch()} /> : null}
            {list.isPending ? <SkeletonRows count={3} /> : null}
            {!list.isPending && !list.isError && items.length === 0 ? (
              typed ? (
                <EmptyState icon="Search" title="Nothing matches that" hint="Check the spelling, or try the first letters of the name." />
              ) : (
                <EmptyState icon="Package" title="No in-stock items to show" hint="Search by name or code to check an item’s availability." />
              )
            ) : null}

            <View onLayout={layout ? (event) => setGridWidth(event.nativeEvent.layout.width) : undefined} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {(express && !typed ? items.slice(0, 8) : items).map((it) => {
                const n = qtyOf(it.variantId);
                const out = isOut(it);
                const starred = favorites.some((entry) => entry.variantId === it.variantId);
                const product = (
                  <Tap
                    accessibilityRole="button"
                    accessibilityLabel={`${it.name}, ${formatBDT(it.price)}${n > 0 ? `, ${t('{n} in the cart', { n })}` : ''}`}
                    onPress={() => onPick(it)}
                    style={{ minHeight: touch ? 84 : express || sheet ? 56 : 76, padding: Spacing.three, gap: 4, justifyContent: 'center' }}>
                    {(touch || layout === 'wall') && it.image ? <Image source={it.image} contentFit="cover" cachePolicy="memory" style={{ height: 76, borderRadius: Radius.md, backgroundColor: theme.canvas }} /> : null}
                    <ThemedText type="smallMedium" numberOfLines={2} literal style={!it.image || express || sheet ? { paddingEnd: 28 } : undefined}>{it.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {formatBDT(it.price, { dp: 0 })}
                      {it.allowDecimal && it.unitShort ? ` / ${it.unitShort}` : ''}
                      {out ? ` · ${t('Finished')}` : ''}
                    </ThemedText>
                  </Tap>
                );
                return (
                  <View key={it.variantId} style={{ flexBasis: tileWidth ?? '48%', flexGrow: tileWidth === undefined ? 1 : 0, borderRadius: Radius.lg, borderCurve: 'continuous', opacity: out ? 0.55 : 1, backgroundColor: n > 0 ? theme.successSoft : theme.card, borderWidth: n > 0 ? 2 : 1, borderColor: n > 0 ? theme.positive : theme.border }}>
                    {product}
                    <Tap accessibilityRole="button" accessibilityLabel={t(starred ? 'Remove {name} from favorites' : 'Add {name} to favorites', { name: it.name })} accessibilityState={{ selected: starred }} disabled={favoritesBusy} onPress={() => onFavorite(it)} style={{ position: 'absolute', top: 1, end: 1, width: 40, height: 44, borderRadius: Radius.md, backgroundColor: n > 0 ? theme.successSoft : theme.card, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={starred ? 'StarFilled' : 'Star'} size={20} color={starred ? theme.brandText : theme.textMuted} />
                    </Tap>
                    {touch && onFewer ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: theme.border }}>
                        <Tap accessibilityRole="button" accessibilityLabel={t('Fewer {name}', { name: it.name })} disabled={n <= 0} onPress={() => onFewer(it)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="Minus" size={18} color={n <= 0 ? theme.textMuted : theme.brandText} /></Tap>
                        <ThemedText type="smallMedium">{n}</ThemedText>
                        <Tap accessibilityRole="button" accessibilityLabel={t('More {name}', { name: it.name })} onPress={() => onPick(it)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="Plus" size={18} color={theme.brandText} /></Tap>
                      </View>
                    ) : n > 0 ? (
                      <View pointerEvents="none" style={{ position: 'absolute', top: -8, start: -6, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.go }}>
                        <ThemedText type="caption" style={{ color: theme.onBrand }}>{n}</ThemedText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {list.hasNextPage && (!express || typed) ? <Button title="Show more" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
