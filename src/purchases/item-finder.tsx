import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { Scanner } from '@/scan/scanner';
import { searchCatalog } from '@/sell/catalog';
import type { CatalogItem } from '@/sell/catalog-map';
import { lookupCode } from '@/sell/api';
import { showToast } from '@/ui/toast';

/**
 * Find something to buy: type a name or code, or scan a barcode. Every item is listed, finished ones too, because that is what you reorder.
 * It stays open while you add, so one visit can add many items; the check shows what is already on the order.
 */
export function ItemFinder({ visible, onClose, onPick, onCode, countOf, branchId, canScan }: { visible: boolean; onClose: () => void; onPick: (item: CatalogItem) => void; onCode: (item: CatalogItem) => void; countOf: (variantId: string) => number; branchId: string; canScan: boolean }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [camera, setCamera] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTyped(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const list = useInfiniteQuery({
    queryKey: ['purchase-items', typed],
    queryFn: ({ pageParam }) => searchCatalog({ q: typed, page: pageParam, wholesale: false }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: visible && typed.length > 0,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  async function scanned(code: string) {
    try {
      const found = await lookupCode(code, branchId);
      if (!found) {
        showToast({ text: t('No item has that code.') });
        return;
      }
      onCode({ variantId: found.variantId, sku: found.sku, name: found.name, price: found.unitPrice, unitShort: found.unitShort ?? null, allowDecimal: !!found.allowDecimal, stock: null });
    } catch {
      showToast({ text: t('That scan could not be looked up') });
    }
  }

  return (
    <BottomSheet visible={visible} onClose={() => { setCamera(false); onClose(); }} title="Add an item">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Find an item" value={text} onChangeText={setText} placeholder="Name or code" autoCapitalize="none" autoCorrect={false} autoFocus />
          </View>
          {canScan ? (
            <Tap accessibilityRole="button" accessibilityLabel={t(camera ? 'Stop the camera' : 'Scan a barcode')} onPress={() => setCamera((v) => !v)} style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: camera ? theme.brand : theme.card, borderWidth: 1, borderColor: camera ? theme.brand : theme.inputBorder }}>
              <Icon name="ScanLine" size={22} color={camera ? theme.onBrand : theme.brand} />
            </Tap>
          ) : null}
        </View>
        {camera ? <Scanner height={170} onCode={(c) => void scanned(c)} /> : null}

        {!typed && !camera ? <ThemedText type="small" themeColor="textMuted">Type a name or a code to find the item.</ThemedText> : null}
        {typed && list.isPending ? <SkeletonRows count={3} /> : null}
        {list.isError ? <ErrorState message={t('Could not search the items.')} onRetry={() => void list.refetch()} /> : null}
        {typed && list.isSuccess && items.length === 0 ? <EmptyState icon="Search" title="No item found" hint="Check the spelling, or try the code on the packet." /> : null}
        {items.map((it) => {
          const n = countOf(it.variantId);
          return (
            <Tap key={it.variantId} accessibilityRole="button" accessibilityLabel={`${it.name}${n > 0 ? `, ${t('{n} in the cart', { n })}` : ''}`} onPress={() => onPick(it)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.md, borderWidth: n > 0 ? 2 : 1, borderColor: n > 0 ? theme.positive : theme.border, backgroundColor: n > 0 ? theme.successSoft : theme.card }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallMedium" numberOfLines={2} literal>
                  {it.name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted" literal>
                  {it.sku}
                  {it.stock !== null ? ` · ${t('{n} in stock', { n: Number(it.stock) })}` : ''}
                </ThemedText>
              </View>
              {n > 0 ? <Icon name="Check" size={20} color={theme.success} /> : <Icon name="Plus" size={20} color={theme.brand} />}
            </Tap>
          );
        })}
        {list.hasNextPage ? <Button title="Show more" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
        <Button title="Done" onPress={() => { setCamera(false); onClose(); }} />
      </View>
    </BottomSheet>
  );
}
