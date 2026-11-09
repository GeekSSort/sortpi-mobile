import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listDeliveries, markInstalled, stepDelivery, type Delivery } from '@/trade/api';
import { deliverySteps } from '@/trade/logic';
import { showToast } from '@/ui/toast';

const FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'PENDING', label: 'To send' },
  { key: 'OUT', label: 'Out now' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'FAILED', label: 'Failed' },
];
const WORD: Record<string, string> = { PENDING: 'To send', OUT: 'Out now', DELIVERED: 'Delivered', FAILED: 'Failed' };

/** Goods sent to customers: who, where, with which rider, and the cash to collect. Move one on when it leaves, arrives or fails. Needs `sale.view`; moving on needs `sale.create`. */
export default function DeliveriesScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('sale.view');
  const canStep = perms.includes('sale.create');
  const [status, setStatus] = useState<string | null>(null);
  const [picked, setPicked] = useState<Delivery | null>(null);
  const list = useInfiniteQuery({ queryKey: ['deliveries', status], queryFn: ({ pageParam }) => listDeliveries({ status, page: pageParam }), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey: ['deliveries'] });
  const fail = (e: unknown) => Alert.alert(t('Could not update it'), e instanceof ApiError ? e.message : t('Try again.'));
  const step = useMutation({ mutationFn: (v: { d: Delivery; to: 'OUT' | 'DELIVERED' | 'FAILED' }) => stepDelivery(v.d.id, v.to === 'DELIVERED' && Number(v.d.cash_to_collect) > 0 ? { status: v.to, cash: v.d.cash_to_collect, payment_method: 'CASH' } : { status: v.to }), onSuccess: () => { refresh(); showToast({ text: t('Updated.') }); }, onError: fail });
  const installed = useMutation({ mutationFn: (d: Delivery) => markInstalled(d.id, me?.full_name || me?.email || ''), onSuccess: () => { refresh(); showToast({ text: t('Marked as installed.') }); }, onError: fail });
  const steps = picked ? deliverySteps(picked, canStep) : null;

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see deliveries. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {FILTERS.map((f) => {
          const on = status === f.key;
          return (
            <Tap key={f.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setStatus(f.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {t(f.label)}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {list.isError ? <ErrorState message={t('Could not load the deliveries.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Deliveries') }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => {
          const colour = { PENDING: theme.warning, OUT: theme.brand, DELIVERED: theme.success, FAILED: theme.danger }[item.status] ?? theme.border;
          return (
            <Tap accessibilityRole="button" onPress={() => setPicked(item)} style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: colour, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
                <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
                  {item.customer_name}
                </ThemedText>
                <ThemedText type="smallMedium" literal style={{ color: colour }}>
                  {t(WORD[item.status] ?? item.status)}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} literal>
                {item.address}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                {[item.invoice_number, item.rider, Number(item.cash_to_collect) > 0 ? `${t('Cash to collect')} ${formatBDT(item.cash_to_collect, { dp: 0 })}` : '', item.installation_required && !item.installed_at ? t('Needs installing') : ''].filter(Boolean).join(' · ')}
              </ThemedText>
            </Tap>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Truck" title="No deliveries" hint="Goods sent to customers show here." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
      <ActionSheet
        title={picked?.customer_name ?? null}
        actions={[
          ...(picked && steps?.out ? [{ title: t('It has gone out'), icon: 'Truck' as const, onPress: () => { const d = picked; setPicked(null); step.mutate({ d, to: 'OUT' }); } }] : []),
          ...(picked && steps?.delivered ? [{ title: t('It was delivered'), icon: 'CheckCircle' as const, onPress: () => { const d = picked; setPicked(null); step.mutate({ d, to: 'DELIVERED' }); } }] : []),
          ...(picked && steps?.failed ? [{ title: t('It could not be delivered'), icon: 'TriangleAlert' as const, onPress: () => { const d = picked; setPicked(null); step.mutate({ d, to: 'FAILED' }); } }] : []),
          ...(picked && steps?.installed ? [{ title: t('It has been installed'), icon: 'Check' as const, onPress: () => { const d = picked; setPicked(null); installed.mutate(d); } }] : []),
          ...(picked?.phone ? [{ title: t('Call {phone}', { phone: picked.phone }), icon: 'Phone' as const, onPress: () => void Linking.openURL(`tel:${picked.phone}`) }] : []),
        ]}
        onClose={() => setPicked(null)}
      />
    </View>
  );
}
