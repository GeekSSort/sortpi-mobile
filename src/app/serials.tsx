import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { listSerials, moveSerials, registerSerials, type Serial } from '@/extras/api';
import { parseSerials } from '@/extras/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { ItemFinder } from '@/purchases/item-finder';
import { findWarehouseId } from '@/sell/api';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';
import { listWarehouses } from '@/warehouses/api';

type Status = 'IN_STOCK' | 'SOLD' | null;

/** Items sold with a serial number: find one, see its warranty, register new ones, move units. Only trades with serials (phones, electronics). Reading needs `inventory.view`; registering `inventory.adjust`; moving `inventory.transfer`. */
export default function SerialsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const perms = me?.permissions ?? [];
  const branchId = me?.active_branch?.id ?? '';
  const allowed = perms.includes('inventory.view');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const list = useInfiniteQuery({ queryKey: ['serials', search, status], queryFn: ({ pageParam }) => listSerials({ search, status, page: pageParam }), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey: ['serials'] });
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.');

  const [adding, setAdding] = useState(false);
  const [finding, setFinding] = useState(false);
  const [item, setItem] = useState<{ variantId: string; name: string } | null>(null);
  const [typed, setTyped] = useState('');
  const [moving, setMoving] = useState<Serial | null>(null);
  const [dest, setDest] = useState<{ id: string; name: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const warehouse = useQuery({ queryKey: ['warehouse', branchId], queryFn: () => findWarehouseId(branchId), enabled: !!branchId, staleTime: 10 * 60_000 });
  const list_ = parseSerials(typed);
  const register = useMutation({
    mutationFn: () => registerSerials({ variant: item!.variantId, warehouse: warehouse.data as string, serials: list_ }),
    onSuccess: () => { refresh(); showToast({ text: t('{n} serial numbers added.', { n: list_.length }) }); setAdding(false); setItem(null); setTyped(''); },
    onError: fail,
  });
  const move = useMutation({
    mutationFn: () => moveSerials({ serials: [moving!.serial], warehouse: dest!.id }),
    onSuccess: () => { refresh(); showToast({ text: t('Moved.') }); setMoving(null); setDest(null); },
    onError: fail,
  });
  const chip = (label: string, on: boolean, press: () => void) => (
    <Tap key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={press} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Tap>
  );

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see serial numbers. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <Field label="Find a serial number" value={search} onChangeText={setSearch} autoCapitalize="characters" autoCorrect={false} returnKeyType="search" />
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {chip(t('All'), status === null, () => setStatus(null))}
        {chip(t('In stock'), status === 'IN_STOCK', () => setStatus('IN_STOCK'))}
        {chip(t('Sold'), status === 'SOLD', () => setStatus('SOLD'))}
      </View>
      {list.isError ? <ErrorState message={t('Could not load the serial numbers.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Serial Numbers'), headerRight: perms.includes('inventory.adjust') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => { setFailure(null); setAdding(true); }} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => (
          <Tap accessibilityRole="button" disabled={!(perms.includes('inventory.transfer') && r.status === 'IN_STOCK')} onPress={() => { setFailure(null); setDest(null); setMoving(r); }} style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="bodyMedium" literal>
                {r.serial}
              </ThemedText>
              <ThemedText type="smallMedium" literal style={{ color: r.status === 'IN_STOCK' ? theme.success : theme.textSecondary }}>
                {t(r.status === 'IN_STOCK' ? 'In stock' : 'Sold')}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} literal>
              {`${r.product_name}${r.variant_name && r.variant_name !== r.product_name ? ` ${r.variant_name}` : ''}`}
            </ThemedText>
            <ThemedText type="caption" themeColor={r.status === 'SOLD' && !r.in_warranty ? 'textMuted' : 'textMuted'} numberOfLines={1} literal>
              {r.status === 'IN_STOCK' ? r.warehouse_name : [r.customer_name, r.invoice_number, r.warranty_until ? `${r.in_warranty ? t('Warranty until') : t('Warranty ended')} ${r.warranty_until}` : ''].filter(Boolean).join(' · ')}
            </ThemedText>
          </Tap>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="ScanLine" title="No serial numbers" hint="Add the serial numbers of items that have arrived." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Add serial numbers">
        <View style={{ gap: Spacing.three }}>
          <Button title={item ? item.name : 'Choose the item'} variant="secondary" onPress={() => setFinding(true)} />
          <Field label="Serial numbers" required value={typed} onChangeText={setTyped} multiline autoCapitalize="characters" autoCorrect={false} hint="One on each line, or separated by commas." />
          {failure ? <Notice>{failure}</Notice> : null}
          <Button title={list_.length ? `${t('Add')} ${list_.length}` : 'Add'} variant="success" size="lg" loading={register.isPending} disabled={!item || list_.length === 0 || !warehouse.data} onPress={() => { setFailure(null); register.mutate(); }} />
        </View>
      </BottomSheet>
      <BottomSheet visible={moving !== null} onClose={() => setMoving(null)} title={moving ? t('Move {serial}', { serial: moving.serial }) : ''}>
        <View style={{ gap: Spacing.three }}>
          <Picker label="Move to" required value={dest} onChange={setDest} load={async (s) => (await listWarehouses()).filter((w) => w.is_active && (!s || w.name.toLowerCase().includes(s.toLowerCase()))).map((w) => ({ id: w.id, name: w.name }))} queryKey="serial-move" />
          {failure ? <Notice>{failure}</Notice> : null}
          <Button title="Move it" variant="success" size="lg" loading={move.isPending} disabled={!dest} onPress={() => { setFailure(null); move.mutate(); }} />
        </View>
      </BottomSheet>
      <ItemFinder visible={finding} onClose={() => setFinding(false)} branchId={branchId} canScan={usesBarcodes} countOf={() => 0} onPick={(it) => { setItem({ variantId: it.variantId, name: it.name }); setFinding(false); }} onCode={(it) => { setItem({ variantId: it.variantId, name: it.name }); setFinding(false); }} />
    </View>
  );
}
