import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
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
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listOffers, listProducts, productSummary, type Product } from '@/products/api';
import { shopOfferFor } from '@/products/logic';
import { Pill, useLevelStyle } from '@/products/variant-card';
import { formatQuantity, stockLevel } from '@/stock/status';

/** Every item in the shop: search by name, code or barcode, open one to see and change its price. */
export default function ProductsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const [search, setSearch] = useState('');
  const allowed = me?.permissions?.includes('product.view') ?? false;
  const canAdd = me?.permissions?.includes('product.create') ?? false;

  const list = useInfiniteQuery({
    queryKey: ['products', 'list', search.trim()],
    queryFn: ({ pageParam }) => listProducts({ search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
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
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <ToneTile label="Items" icon="Package" value={sum ? String(sum.total_products) : '…'} />
        {sum?.stock_value !== undefined ? <ToneTile label="Stock is worth" icon="Cash" tone="good" value={formatBDT(sum.stock_value, { dp: 0 })} note="At what you paid" /> : null}
      </View>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, code or barcode" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load items.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-product')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ProductRow product={item} offered={item.variants.some((v) => shopOfferFor(offers.data ?? [], v.id))} onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : search.trim() ? (
            <EmptyState icon="Search" title="No item matches that" hint="Check the spelling, or try the code on the packet." action={{ title: 'Clear search', onPress: () => setSearch('') }} />
          ) : (
            <EmptyState icon="Package" title="No items yet" hint="Add the things you sell." action={canAdd ? { title: 'Add an item', onPress: () => router.push('/add-product') } : undefined} />
          )
        }
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), summary.refetch(), offers.refetch()])}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
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
        <View style={{ alignItems: 'flex-end' }}>
          {several ? (
            <ThemedText type="caption" themeColor="textMuted">
              Starts at
            </ThemedText>
          ) : null}
          <ThemedText type="bodyMedium" style={{ color: theme.success }} numberOfLines={1} literal>
            {price}
          </ThemedText>
        </View>
        <Icon name="ChevronRight" size={16} color={theme.textMuted} />
      </View>
    </Tap>
  );
}
