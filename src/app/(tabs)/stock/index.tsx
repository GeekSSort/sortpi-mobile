import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { HeaderAction } from '@/components/header-action';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { ErrorState } from '@/components/error-state';
import { ToneTile as Tile } from '@/components/tone-tile';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { lookupCode } from '@/sell/api';
import { setPendingItem } from '@/sell/pending';
import { showToast } from '@/ui/toast';
import { Scanner } from '@/scan/scanner';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { listStock, stockSummary, type StockFilter, type StockRow } from '@/stock/api';
import { formatQuantity, STOCK_LEVEL_LABEL, stockLevel, type StockLevel } from '@/stock/status';


/** What is on the shelf in this branch: search or scan a code, filter by level, and add a product. */
export default function StockScreen() {
  const theme = useTheme();
  const t = useT();
  const bigText = useTextFactor() > BIG_TEXT;
  const router = useRouter();
  const { me } = useSession();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  // Home's "Running low" and "Finished" tiles land here already filtered.
  const params = useLocalSearchParams<{ filter?: string; n?: string }>();
  useEffect(() => {
    if (params.filter === 'low' || params.filter === 'out' || params.filter === 'in') setFilter(params.filter);
  }, [params.filter, params.n]);
  const pick = (f: StockFilter) => setFilter((cur) => (cur === f ? 'all' : f));
  const [scanning, setScanning] = useState(false);
  const usesBarcodes = useUsesBarcodes();
  const canAdd = me?.permissions?.includes('product.create') ?? false;
  const canSell = ['pos.access', 'sale.create'].every((p) => me?.permissions?.includes(p));
  const [picked, setPicked] = useState<StockRow | null>(null);

  /** Put this item in the cart and go to Sell: the code is looked up the same way the till does it, so the price is the branch price. */
  async function sellThis(row: StockRow) {
    try {
      const item = me?.active_branch ? await lookupCode(row.sku, me.active_branch.id) : null;
      if (!item) return showToast({ text: t('Could not find this item to sell.') });
      setPendingItem(item);
      router.navigate('/sell');
    } catch {
      showToast({ text: t('Could not connect. Try again.') });
    }
  }

  const summary = useQuery({ queryKey: ['stock', 'summary'], queryFn: () => stockSummary(), staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['stock', 'list', search.trim(), filter],
    queryFn: ({ pageParam }) => listStock({ search, filter, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = summary.data;

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Items" icon="Package" value={s ? String(s.lines) : '…'} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Tile label="Low" value={s ? String(s.low_stock) : '…'} tone={s && s.low_stock > 0 ? 'warn' : undefined} icon="TriangleAlert" selected={filter === 'low'} onPress={() => pick('low')} />
        <Tile label="Out" value={s ? String(s.out_of_stock) : '…'} tone={s && s.out_of_stock > 0 ? 'bad' : undefined} icon="Cancel" selected={filter === 'out'} onPress={() => pick('out')} />
      </View>
      {s?.stock_value ? (
        <ThemedText type="small" themeColor="textMuted">
          {t('Stock value {amount}', { amount: formatBDT(s.stock_value, { dp: 0 }) })}
        </ThemedText>
      ) : null}

      {usesBarcodes && scanning ? <Scanner height={170} onCode={(c) => { setSearch(c); setScanning(false); }} /> : null}
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Search" value={search} onChangeText={setSearch} placeholder={usesBarcodes ? 'Name, code or barcode' : 'Name or code'} autoCapitalize="none" autoCorrect={false} />
        </View>
        {usesBarcodes ? <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(scanning ? 'Stop the camera' : 'Scan a barcode')}
          onPress={() => setScanning((v) => !v)}
          style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: scanning ? theme.brand : theme.card, borderWidth: 1, borderColor: scanning ? theme.brand : theme.inputBorder }}>
          <Icon name="ScanLine" size={22} color={scanning ? theme.onBrand : theme.brand} />
        </Pressable> : null}
      </View>

      {list.isError ? <ErrorState message={t('Could not load the stock.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-product')} /> : undefined }} />
      <View style={{ flex: 1 }}>
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <StockItem row={item} forced={filter === 'low' ? 'low' : undefined} onLongPress={canSell ? () => { haptics.tap(); setPicked(item); } : undefined} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            list.isPending ? (
              <SkeletonRows />
            ) : (
              search.trim() || filter !== 'all' ? (
                <EmptyState icon="Search" title="Nothing matches that" hint="Check the spelling, or try the first letters of the name." action={{ title: 'Show everything', onPress: () => { setSearch(''); setFilter('all'); } }} />
              ) : (
                <EmptyState icon="Package" title="No items yet" hint="Add your first item and it will show up here." action={canAdd ? { title: 'Add an item', onPress: () => router.push('/add-product') } : undefined} />
              )
            )
          }
          ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={list.isRefetching && !list.isFetchingNextPage}
          onRefresh={() => void Promise.all([list.refetch(), summary.refetch()])}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
        />
        <ActionSheet title={picked ? stockName(picked) : null} actions={picked ? [{ title: 'Sell this', icon: 'Plus', onPress: () => void sellThis(picked) }] : []} onClose={() => setPicked(null)} />
      </View>
    </View>
  );
}


const stockName = (row: StockRow) => (row.variant_name && row.variant_name.toLowerCase() !== 'default' ? `${row.product_name} · ${row.variant_name}` : row.product_name);

/** `forced`: the server already decided (the list is filtered to low), and a stock row's own reorder_level can read 0 even when the server counts it low (seen on the demo shop), so trust the server's filter. */
function StockItem({ row, forced, onLongPress }: { row: StockRow; forced?: StockLevel; onLongPress?: () => void }) {
  const theme = useTheme();
  const level = forced ?? stockLevel(row.available, row.reorder_level);
  const name = stockName(row);
  return (
    <Pressable accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Sell this' }] : undefined} onAccessibilityAction={onLongPress} onLongPress={onLongPress} delayLongPress={350} android_ripple={onLongPress ? { color: theme.backgroundSelected } : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: level === 'in' ? theme.positive : level === 'low' ? theme.warning : theme.danger, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={2} literal>
          {name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {row.sku} · {formatBDT(row.price)}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <ThemedText type="bodyMedium">
          {formatQuantity(row.available, row.unit_allow_decimal)} <ThemedText type="caption" themeColor="textMuted" literal>{row.unit_short_name}</ThemedText>
        </ThemedText>
        <LevelPill level={level} />
      </View>
    </Pressable>
  );
}

function LevelPill({ level }: { level: StockLevel }) {
  const theme = useTheme();
  const tone = { in: [theme.successSoft, theme.success], low: [theme.warningSoft, theme.warning], out: [theme.dangerSoft, theme.danger], negative: [theme.dangerSoft, theme.danger] }[level];
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: tone[0] }}>
      <ThemedText type="caption" style={{ color: tone[1] }}>
        {STOCK_LEVEL_LABEL[level]}
      </ThemedText>
    </View>
  );
}
