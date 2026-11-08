import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { listCustomers } from '@/customers/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listTradeIns, takeTradeIn } from '@/trade/api';
import { validateTradeIn } from '@/trade/logic';
import { showToast } from '@/ui/toast';

/** Old devices taken in part payment: whose, what, its condition and what it was valued at. Needs `sale.view`; taking one in needs `sale.create`. Only trades that take trade-ins. */
export default function TradeInsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('sale.view');
  const list = useInfiniteQuery({ queryKey: ['trade-ins'], queryFn: ({ pageParam }) => listTradeIns(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [device, setDevice] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState('');
  const [value, setValue] = useState('');
  const [errors, setErrors] = useState<{ customerId?: string; device?: string; value?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => takeTradeIn({ customer_id: customer!.id, device: device.trim(), ...(imei.trim() ? { imei: imei.trim() } : {}), ...(condition.trim() ? { condition: condition.trim() } : {}), ...(value.trim() ? { value: value.trim() } : {}) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['trade-ins'] }); showToast({ text: t('Trade-in saved.') }); setOpen(false); setDevice(''); setImei(''); setCondition(''); setValue(''); },
    onError: (e) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.'),
  });
  function submit() {
    const e = validateTradeIn({ customerId: customer?.id ?? '', device, value });
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see trade-ins. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Trade-ins'), headerRight: perms.includes('sale.create') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => { setFailure(null); setErrors({}); setOpen(true); }} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
                {item.device}
              </ThemedText>
              <ThemedText type="bodyMedium" literal>
                {formatBDT(item.value, { dp: 0 })}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
              {[item.customer_name, item.imei, item.condition, item.created_at.slice(0, 10)].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the trade-ins.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Undo" title="No trade-ins yet" hint="Old devices taken in part payment show here." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Take a device in">
        <View style={{ gap: Spacing.three }}>
          <Picker label="Customer" required value={customer} onChange={setCustomer} load={async (s) => (await listCustomers({ search: s ?? '', owes: false, page: 1 })).rows.map((c) => ({ id: c.id, name: c.name }))} queryKey="trade-in-customers" error={errors.customerId} />
          <Field label="Device" required value={device} onChangeText={setDevice} autoCapitalize="words" error={errors.device} />
          <Field label="IMEI or serial (optional)" value={imei} onChangeText={setImei} autoCapitalize="characters" autoCorrect={false} />
          <Field label="Condition (optional)" value={condition} onChangeText={setCondition} />
          <Field label="Value you give for it" prefix="৳" value={value} onChangeText={setValue} keyboardType="decimal-pad" error={errors.value} />
          {failure ? <Notice>{failure}</Notice> : null}
          <Button title="Save" variant="success" size="lg" loading={save.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </View>
  );
}
