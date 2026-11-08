import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { deleteRegular, listRegular, payRegular, regularSummary, skipRegular, updateRegular, type Regular } from '@/regular/api';
import { canSettle, frequencyWord, regularLook } from '@/regular/logic';
import { showToast } from '@/ui/toast';

/** Bills and income that repeat, like rent: what is due, pay it, skip it, change it or stop it. */
export default function RegularPaymentsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const can = (...c: string[]) => c.some((x) => perms.includes(x));
  const allowed = can('income.view', 'expense.view');
  const [picked, setPicked] = useState<Regular | null>(null);
  const list = useInfiniteQuery({ queryKey: ['regular'], queryFn: ({ pageParam }) => listRegular(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const sum = useQuery({ queryKey: ['regular', 'summary'], queryFn: regularSummary, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['regular'] });
    void qc.invalidateQueries({ queryKey: ['vouchers'] });
  };
  const fail = (title: string) => (e: unknown) => {
    refresh();
    Alert.alert(t(title), e instanceof ApiError ? e.message : t('Try again.'));
  };
  const pay = useMutation({ mutationFn: (r: Regular) => payRegular(r.id, r.next_due_date), onSuccess: (v) => { refresh(); showToast({ text: t('Paid. Voucher {no}', { no: v.voucher_no }) }); }, onError: fail('It was not paid') });
  const skip = useMutation({ mutationFn: (r: Regular) => skipRegular(r.id, r.next_due_date), onSuccess: () => { refresh(); showToast({ text: t('Skipped this time.') }); }, onError: fail('It was not skipped') });
  const stop = useMutation({ mutationFn: (r: Regular) => deleteRegular(r.id), onSuccess: () => { refresh(); showToast({ text: t('Removed.') }); }, onError: fail('It was not removed') });
  const flip = useMutation({ mutationFn: (r: Regular) => updateRegular(r.id, { is_active: !r.is_active }), onSuccess: refresh, onError: fail('It was not changed') });

  function askPay(r: Regular) {
    const out = r.kind === 'EXPENSE';
    Alert.alert(t(out ? 'Pay {name}?' : 'Receive {name}?', { name: r.name }), `${formatBDT(r.amount)} · ${r.next_due_date}\n${t('This writes a voucher.')}`, [
      { text: t('Not now'), style: 'cancel' },
      { text: t(out ? 'Pay' : 'Receive'), onPress: () => pay.mutate(r) },
    ]);
  }
  function askStop(r: Regular) {
    Alert.alert(t('Remove {name}?', { name: r.name }), t('Payments already made stay on record. It just stops repeating.'), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, remove'), style: 'destructive', onPress: () => stop.mutate(r) },
    ]);
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see regular payments. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {sum.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Overdue" icon={sum.data.overdue ? 'TriangleAlert' : 'CheckCircle'} tone={sum.data.overdue ? 'bad' : 'good'} value={String(sum.data.overdue)} />
          <ToneTile label="Due soon" icon={sum.data.due_soon ? 'TriangleAlert' : 'CheckCircle'} tone={sum.data.due_soon ? 'warn' : 'good'} value={String(sum.data.due_soon)} />
          <ToneTile label="Out each month" icon="Cash" value={formatBDT(sum.data.monthly_out, { dp: 0 })} />
        </View>
      ) : null}
      {list.isError ? <ErrorState message={t('Could not load the regular payments.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Regular Payments'), headerRight: can('income.create', 'expense.create') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-regular-payment')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Line r={item} onPress={() => setPicked(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Cash" title="Nothing repeats yet" hint="Add rent, bills or regular income so you never forget them." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), sum.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <ActionSheet
        title={picked?.name ?? null}
        actions={[
          ...(picked && canSettle(picked) && can('income.create', 'expense.create') ? [{ title: t(picked.kind === 'EXPENSE' ? 'Pay now' : 'Receive now'), icon: 'CheckCircle' as const, onPress: () => { const r = picked; setPicked(null); askPay(r); } }] : []),
          ...(picked && canSettle(picked) && can('income.update', 'expense.update') ? [{ title: t('Skip this time'), icon: 'Undo' as const, onPress: () => { const r = picked; setPicked(null); skip.mutate(r); } }] : []),
          ...(picked && can('income.update', 'expense.update') ? [{ title: t('Edit'), icon: 'Pencil' as const, onPress: () => { const id = picked.id; setPicked(null); router.push({ pathname: '/add-regular-payment', params: { id } }); } }] : []),
          ...(picked && can('income.update', 'expense.update') ? [{ title: t(picked.is_active ? 'Pause' : 'Switch on'), icon: 'Pause' as const, onPress: () => { const r = picked; setPicked(null); flip.mutate(r); } }] : []),
          ...(picked && can('income.delete', 'expense.delete') ? [{ title: t('Remove'), icon: 'Cancel' as const, onPress: () => { const r = picked; setPicked(null); askStop(r); } }] : []),
        ]}
        onClose={() => setPicked(null)}
      />
    </View>
  );
}

function Line({ r, onPress }: { r: Regular; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const look = regularLook(r);
  const bar = { overdue: theme.danger, due: theme.warning, soon: theme.warning, later: theme.success, off: theme.border }[look];
  const when = look === 'overdue' ? t('{n} days late', { n: Math.abs(r.days_until_due) }) : look === 'due' ? t('Due today') : look === 'off' ? t('Paused') : t('In {n} days', { n: r.days_until_due });
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: bar, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {r.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {`${r.category_name} · ${t(frequencyWord(r.frequency))} · ${when}`}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="bodyMedium" literal style={{ color: r.kind === 'EXPENSE' ? theme.danger : theme.success }}>
          {formatBDT(r.amount, { dp: 0 })}
        </ThemedText>
        <View style={{ borderRadius: Radius.full }}>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {r.next_due_date}
          </ThemedText>
        </View>
      </View>
    </Tap>
  );
}
