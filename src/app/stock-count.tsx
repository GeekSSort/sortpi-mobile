import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Step } from '@/components/quantity-step';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Scanner } from '@/scan/scanner';
import { findWarehouseId, lookupCode } from '@/sell/api';
import { itemName } from '@/sell/catalog-map';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { listCountRows, postCount, stockOfVariant, type StockRow } from '@/stock/api';
import { applyMoved, changedLines, countAsSystem, countBody, describeCountError, difference, missingCost, setCounted, stepCount, tally, type CountLine, type Counts } from '@/stock/count';
import { keepCounts, keptCounts } from '@/stock/draft';
import { formatQuantity } from '@/stock/status';
import { showToast } from '@/ui/toast';

/** Count the shelves: type or tap what is really there, scan to add one at a time, then post only what differs from the system. */
export default function StockCountScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const branchId = me?.active_branch?.id;
  const allowed = me?.permissions?.includes('inventory.adjust') ?? false;
  const warehouse = useQuery({ queryKey: ['stock-count', 'warehouse', branchId], queryFn: () => findWarehouseId(branchId!), enabled: allowed && !!branchId });

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {!allowed ? <View style={{ padding: Spacing.three }}><Notice>You do not have permission to do that.</Notice></View> : null}
      {allowed && warehouse.isPending ? <View style={{ padding: Spacing.three }}><SkeletonRows count={4} /></View> : null}
      {allowed && warehouse.isError ? <ErrorState message={t('Could not find your shelves.')} onRetry={() => void warehouse.refetch()} /> : null}
      {allowed && warehouse.data && branchId ? <Counter warehouse={warehouse.data} branchId={branchId} /> : null}
    </View>
  );
}

function Counter({ warehouse, branchId }: { warehouse: string; branchId: string }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const canScan = useUsesBarcodes();
  const [counts, setCounts] = useState<Counts>(() => keptCounts(branchId));
  const latest = useRef(counts); // a scan can land while an earlier one is still being looked up
  const key = useRef<string | null>(null); // one per posting attempt; any change to the count is a new attempt
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [camera, setCamera] = useState(false);
  const [review, setReview] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; lines: number } | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setTyped(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const update = (fn: (c: Counts) => Counts) => {
    const next = fn(latest.current);
    latest.current = next;
    keepCounts(branchId, next);
    key.current = null;
    setProblem(null);
    setCounts(next);
  };

  const list = useInfiniteQuery({
    queryKey: ['stock-count', 'rows', warehouse, typed],
    queryFn: ({ pageParam }) => listCountRows({ warehouse, search: typed, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 0,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const sums = tally(counts);
  const changed = changedLines(counts);

  async function scanned(code: string) {
    try {
      const found = await lookupCode(code, branchId);
      if (!found) {
        showToast({ text: t('No item has that code.') });
        return;
      }
      const row = await stockOfVariant(warehouse, found.variantId);
      if (!row) {
        showToast({ text: t('That item is not in this shop’s shelves.') });
        return;
      }
      const name = itemName(row.product_name, row.variant_name);
      update((c) => stepCount(c, row, name, 1));
      haptics.success();
      showToast({ text: `${name}: ${latest.current[row.variant]?.counted ?? ''}` });
    } catch {
      showToast({ text: t('That scan could not be looked up') });
    }
  }

  const post = useMutation({
    mutationFn: () => postCount(countBody(warehouse, counts), key.current!),
    onSuccess: (r) => {
      haptics.success();
      setReview(false);
      setDone({ reference: r.reference_no, lines: changed.length });
      update(() => ({}));
      for (const k of ['stock', 'home', 'setup-count', 'stock-count']) void queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => {
      haptics.warning();
      if (e instanceof ApiError && e.code === 'ADJUSTMENT_STOCK_MOVED') {
        update((c) => applyMoved(c, e)); // clears any message, so the explanation is set after it
        void queryClient.invalidateQueries({ queryKey: ['stock-count', 'rows'] });
      }
      setProblem(describeCountError(e));
    },
  });

  function startPosting() {
    setProblem(null);
    const lacking = missingCost(counts);
    if (lacking) {
      setProblem(t('{name} was never in stock and has no cost price. Set its cost price first.', { name: lacking.name }));
      return;
    }
    key.current ??= newIdempotencyKey();
    post.mutate();
  }

  function startAgain() {
    Alert.alert(t('Start the count again?'), t('Everything you counted is cleared. Nothing is changed in your stock.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, clear it'), style: 'destructive', onPress: () => update(() => ({})) }]);
  }

  if (done) {
    return (
      <View style={{ padding: Spacing.three }}>
        <View style={{ alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Check" size={40} color={theme.onBrand} />
          </View>
          <ThemedText type="heading">Count saved</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('{n} items corrected in your stock.', { n: done.lines })}</ThemedText>
          <ThemedText type="caption" themeColor="textMuted" literal>{done.reference}</ThemedText>
          <Button title="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: Spacing.two }} />
          <Button title="Count more" variant="secondary" onPress={() => setDone(null)} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, paddingBottom: Spacing.two }}>
      <ThemedText type="small" themeColor="textSecondary">Look at the shelf. Tap ✓ if it matches the system, or type what is really there. Scanning adds one each time.</ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Find an item" value={text} onChangeText={setText} placeholder="Name or code" autoCapitalize="none" autoCorrect={false} />
        </View>
        {canScan ? (
          <Tap accessibilityRole="button" accessibilityLabel={t(camera ? 'Stop the camera' : 'Scan a barcode')} onPress={() => setCamera((v) => !v)} style={{ width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: camera ? theme.brand : theme.card, borderWidth: 1, borderColor: camera ? theme.brand : theme.inputBorder }}>
            <Icon name="ScanLine" size={22} color={camera ? theme.onBrand : theme.brand} />
          </Tap>
        ) : null}
      </View>
      {camera ? <Scanner height={170} onCode={(c) => void scanned(c)} /> : null}
      {list.isPending ? <SkeletonRows count={4} /> : null}
      {list.isError ? <ErrorState message={t('Could not load your items.')} onRetry={() => void list.refetch()} /> : null}
      {list.isSuccess && rows.length === 0 ? <EmptyState icon="Search" title="No item found" hint="Check the spelling, or try the code on the packet." /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.variant}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
        ListHeaderComponent={header}
        renderItem={({ item }) => <CountItem row={item} line={counts[item.variant]} onChange={update} />}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.6}
        ListFooterComponent={list.isFetchingNextPage ? <SkeletonRows count={2} /> : undefined}
      />

      <View style={{ gap: Spacing.two, padding: Spacing.three, paddingBottom: Math.max(insets.bottom, Spacing.three), borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two }}>
          <ThemedText type="smallMedium">{t('{counted} counted · {differ} differ', { counted: sums.counted, differ: sums.differ })}</ThemedText>
          {sums.counted > 0 ? (
            <Tap accessibilityRole="button" onPress={startAgain} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <ThemedText type="smallMedium" style={{ color: theme.danger }}>Start again</ThemedText>
            </Tap>
          ) : null}
        </View>
        {sums.counted > 0 && sums.differ === 0 ? <ThemedText type="caption" themeColor="textMuted">Everything you counted matches the system, so there is nothing to post.</ThemedText> : null}
        <Button title="Check and post" size="lg" disabled={sums.differ === 0} onPress={() => { setProblem(null); setReview(true); }} />
      </View>

      <BottomSheet visible={review} onClose={() => !post.isPending && setReview(false)} title="Check the count">
        <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
          <ThemedText type="small" themeColor="textSecondary">{t('{n} items will change. The rest are left alone.', { n: changed.length })}</ThemedText>
          {changed.map((l) => <ReviewLine key={l.variant} line={l} />)}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText type="bodyMedium">Net change</ThemedText>
            <ThemedText type="bodyMedium" literal>{`${Number(sums.net) > 0 ? '+' : ''}${Number(sums.net)}`}</ThemedText>
          </View>
          {problem ? <Notice>{problem}</Notice> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button title="Back" variant="secondary" disabled={post.isPending} onPress={() => setReview(false)} style={{ flex: 1 }} />
            <Button title="Post the count" variant="success" loading={post.isPending} onPress={startPosting} style={{ flex: 1 }} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function CountItem({ row, line, onChange }: { row: StockRow; line: CountLine | undefined; onChange: (fn: (c: Counts) => Counts) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const name = itemName(row.product_name, row.variant_name);
  const decimal = row.unit_allow_decimal === true;
  const system = line ? line.expected : row.quantity;
  const diff = line ? Number(difference(line)) : 0;
  const same = !!line && diff === 0;
  const unit = row.unit_short_name ? ` ${row.unit_short_name}` : '';
  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: line ? 2 : 1, borderColor: !line ? theme.border : diff === 0 ? theme.positive : diff < 0 ? theme.danger : theme.brand }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallMedium" numberOfLines={2} literal>{name}</ThemedText>
          <ThemedText type="caption" themeColor="textMuted" literal>{`${row.sku} · ${t('In the system: {n}', { n: formatQuantity(system, decimal) })}${unit}`}</ThemedText>
        </View>
        {line && diff !== 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name={diff < 0 ? 'Minus' : 'Plus'} size={16} color={diff < 0 ? theme.danger : theme.brand} />
            <ThemedText type="smallMedium" style={{ color: diff < 0 ? theme.danger : theme.brand }} literal>{formatQuantity(String(Math.abs(diff)), decimal)}</ThemedText>
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <Tap accessibilityRole="button" accessibilityLabel={t('Same as the system: {name}', { name })} accessibilityState={{ selected: same }} onPress={() => onChange((c) => countAsSystem(c, row, name))} style={{ flexDirection: 'row', gap: 6, minHeight: 48, paddingHorizontal: 14, borderRadius: Radius.full, alignItems: 'center', backgroundColor: same ? theme.successSoft : theme.canvas, borderWidth: 1, borderColor: same ? theme.positive : theme.border }}>
          <Icon name="Check" size={18} color={same ? theme.success : theme.textSecondary} />
          <ThemedText type="smallMedium" style={{ color: same ? theme.success : theme.textSecondary }}>Same</ThemedText>
        </Tap>
        <View style={{ flex: 1 }} />
        <Step icon="Minus" label={t('Fewer {name}', { name })} disabled={!line || Number(line.counted) <= 0} onPress={() => onChange((c) => stepCount(c, row, name, -1))} />
        <TextInput
          value={line?.counted ?? ''}
          onChangeText={(v) => onChange((c) => setCounted(c, row, name, v))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder="—"
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t('Counted {name}', { name })}
          allowFontScaling={false}
          selectTextOnFocus
          style={{ width: 76, height: 48, textAlign: 'center', fontSize: 18, fontWeight: '600', color: theme.text, borderWidth: 1, borderColor: theme.inputBorder, borderRadius: Radius.md, backgroundColor: theme.card }}
        />
        <Step icon="Plus" label={t('More {name}', { name })} disabled={false} onPress={() => onChange((c) => stepCount(c, row, name, 1))} />
      </View>
    </View>
  );
}

function ReviewLine({ line }: { line: CountLine }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const d = Number(difference(line));
  const unit = line.unit ? ` ${line.unit}` : '';
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center', paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: theme.border }}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallMedium" literal numberOfLines={2}>{line.name}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>{`${t('System')} ${Number(line.expected)}${unit} → ${t('Counted')} ${Number(line.counted)}${unit}`}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={d < 0 ? 'Minus' : 'Plus'} size={16} color={d < 0 ? theme.danger : theme.brand} />
        <ThemedText type="smallMedium" style={{ color: d < 0 ? theme.danger : theme.brand }} literal>{String(Math.abs(d))}</ThemedText>
      </View>
    </View>
  );
}
