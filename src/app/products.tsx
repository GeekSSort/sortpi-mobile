import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';

import { useWideLandscape } from '@/hooks/use-wide-landscape';
import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { useDebounced } from '@/lib/use-debounced';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listOffers, listProducts, productByBarcode, productSummary, type Product } from '@/products/api';
import { shopOfferFor } from '@/products/logic';
import { Pill, useLevelStyle } from '@/products/variant-card';
import { Scanner } from '@/scan/scanner';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { useSunmiScanner } from '@/sell/use-sunmi-peripherals';
import { formatQuantity, stockLevel } from '@/stock/status';

/** Every item in the shop: search by name, code or barcode, open one to see and change its price. */
export default function ProductsScreen() {
  const { wideLandscape } = useWideLandscape();
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string>();
  const usesBarcodes = useUsesBarcodes();
  const debouncedSearch = useDebounced(search); // the list asks the shop once the typing pauses, not on every letter
  const allowed = me?.permissions?.includes('product.view') ?? false;
  const canAdd = me?.permissions?.includes('product.create') ?? false;

  const list = useInfiniteQuery({
    queryKey: ['products', 'list', debouncedSearch.trim()],
    queryFn: ({ pageParam }) => listProducts({ search: debouncedSearch, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed && !barcode,
  });
  const exact = useQuery({
    queryKey: ['products', 'scanned-barcode', me?.organization.id, barcode],
    queryFn: () => productByBarcode(barcode!),
    enabled: allowed && !!barcode,
    staleTime: 0,
  });
  const active = barcode ? exact : list;
  const rows = barcode ? (exact.data ? [exact.data] : []) : list.data?.pages.flatMap((p) => p.rows) ?? [];

  function scanProduct(raw: string) {
    const code = raw.trim();
    if (!code) return;
    Keyboard.dismiss();
    setSearch('');
    setBarcode(code);
    setScanning(false);
  }
  function changeSearch(value: string) {
    setBarcode(undefined);
    setSearch(value);
  }
  useSunmiScanner(allowed && usesBarcodes, scanProduct);
  const summary = useQuery({ queryKey: ['products', 'summary'], queryFn: productSummary, enabled: allowed, staleTime: 30_000 });
  const offers = useQuery({ queryKey: ['products', 'offers'], queryFn: listOffers, enabled: allowed, staleTime: 30_000 });
  const sum = summary.data;

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see items. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <Field label="Search" value={barcode ?? search} onChangeText={changeSearch} placeholder="Name, code or barcode" autoCapitalize="none" autoCorrect={false} />
        </View>
        {usesBarcodes ? (
          <Tap accessibilityRole="button" accessibilityLabel={t(scanning ? 'Stop the camera' : 'Scan a barcode')} onPress={() => {
            Keyboard.dismiss();
            setScanning((current) => !current);
          }} style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: scanning ? theme.brand : theme.card, borderWidth: 1, borderColor: scanning ? theme.brand : theme.inputBorder }}>
            <Icon name="ScanLine" size={22} color={scanning ? theme.onBrand : theme.brand} />
          </Tap>
        ) : null}
      </View>
      {usesBarcodes && scanning ? <Scanner height={170} onCode={scanProduct} /> : null}
      {barcode ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText type="small" themeColor="textMuted">Barcode match</ThemedText>
          <HeaderAction title="Clear scan" onPress={() => changeSearch('')} />
        </View>
      ) : !search.trim() && !scanning ? (
        <View style={{ flexDirection: wideLandscape ? 'column' : 'row', gap: Spacing.two }}>
          <ToneTile label="Items" icon="Package" value={sum ? String(sum.total_products) : '…'} />
          {sum?.stock_value !== undefined ? <ToneTile label="Stock is worth" icon="Cash" tone="good" value={formatBDT(sum.stock_value, { dp: 0 })} note="At what you paid" /> : null}
        </View>
      ) : null}
      {active.isError ? <ErrorState message={t('Could not load items.')} onRetry={() => void active.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-product')} /> : undefined }} />
      <AdaptiveList landscapeSidebar
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ProductRow product={item} offered={item.variants.some((v) => shopOfferFor(offers.data ?? [], v.id))} onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          active.isError ? undefined : active.isPending ? (
            <SkeletonRows />
          ) : barcode ? (
            <EmptyState icon="Search" title="No product uses this barcode" hint="Check the label or scan another barcode." action={{ title: 'Clear scan', onPress: () => changeSearch('') }} />
          ) : search.trim() ? (
            <EmptyState icon="Search" title="No item matches that" hint="Check the spelling, or try the code on the packet." action={{ title: 'Clear search', onPress: () => setSearch('') }} />
          ) : (
            <EmptyState icon="Package" title="No items yet" hint="Add the things you sell." action={canAdd ? { title: 'Add Products', onPress: () => router.push('/add-product') } : undefined} />
          )
        }
        ListFooterComponent={!barcode && list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => !barcode && list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={active.isRefetching && (!!barcode || !list.isFetchingNextPage)}
        onRefresh={() => void Promise.all([active.refetch(), summary.refetch(), offers.refetch()])}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
    </View>
  );
}

function ProductRow({ product, offered, onPress }: { product: Product; offered: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const levelStyle = useLevelStyle();
  const level = levelStyle(stockLevel(product.stock_on_hand, product.reorder_level));
  const prices = product.variants.map((v) => Number(v.price));
  const from = prices.length ? Math.min(...prices) : 0;
  const several = product.variants.length > 1;
  const finished = product.variants.filter((v) => Number(v.stock_on_hand) <= 0).length;
  const price = formatBDT(String(from), { dp: 0 });
  const priceText = several ? t('from {amount}', { amount: price }) : price;
  const qty = formatQuantity(product.stock_on_hand, product.unit_allow_decimal);
  const stockText = Number(product.stock_on_hand) <= 0 ? level.word : `${level.word} · ${qty}`;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${priceText}, ${stockText}`}
      onPress={onPress}
      style={{ flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: level.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={2} literal>
          {product.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {product.category_name}
          {several ? ` · ${t('{n} kinds', { n: product.variants.length })}` : ''}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pill icon={level.icon} text={stockText} fg={level.fg} soft={level.soft} line={level.line} />
          {offered ? <Pill icon="Tag" text={t('Offer')} fg={theme.success} soft={theme.successSoft} line={theme.successBorder} /> : null}
        </View>
        {several && finished > 0 && finished < product.variants.length ? (
          <ThemedText type="caption" style={{ color: theme.danger }} literal>
            {t('{n} kinds finished', { n: finished })}
          </ThemedText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <View style={{ alignItems: 'flex-end', minWidth: 84 }}>
          {several ? (
            <ThemedText type="caption" themeColor="textMuted">
              Starts at
            </ThemedText>
          ) : null}
          <ThemedText type="bodyMedium" style={{ color: theme.success, textAlign: 'right', minWidth: 84 }} numberOfLines={1} adjustsFontSizeToFit literal>
            {price}
          </ThemedText>
        </View>
        <Icon name="ChevronRight" size={16} color={theme.textMuted} />
      </View>
    </Tap>
  );
}
