import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { ApiError } from '@/api/client';
import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/customers/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { collectInstalment, listInstalments, type Instalment } from '@/trade/api';
import { collectProblem, isOverdue } from '@/trade/logic';
import { showToast } from '@/ui/toast';

/** Credit sales paid in monthly parts: who owes what, what is late, and take the next part. Needs `sale.view`; collecting needs `customer.payment`. */
export default function InstalmentsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('sale.view');
  const canCollect = perms.includes('customer.payment');
  const [lateOnly, setLateOnly] = useState(false);
  const list = useInfiniteQuery({ queryKey: ['instalments', lateOnly], queryFn: ({ pageParam }) => listInstalments({ overdueOnly: lateOnly, page: pageParam }), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const [plan, setPlan] = useState<Instalment | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [problem, setProblem] = useState<string | null>(null);
  const [key, setKey] = useState(() => newIdempotencyKey()); // one per open form; any change makes a new attempt
  const touch = () => setKey(newIdempotencyKey());
  const collect = useMutation({
    mutationFn: () => collectInstalment(plan!.id, { amount: amount.trim(), payment_method: method }, key),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['instalments'] }); void qc.invalidateQueries({ queryKey: ['customers'] }); showToast({ text: t('Payment recorded.') }); setPlan(null); setKey(newIdempotencyKey()); },
    onError: (e) => setProblem(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.'),
  });
  function open(p: Instalment) {
    setPlan(p);
    setAmount(String(Number(p.next_amount) || ''));
    setMethod('CASH');
    setProblem(null);
    touch();
  }
  function submit() {
    const msg = collectProblem(amount, plan!.outstanding);
    setProblem(msg);
    if (!msg) collect.mutate();
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see instalments. Ask the owner.</Notice>
      </View>
    );
  }
  const chip = (label: string, on: boolean, press: () => void) => (
    <Tap accessibilityRole="button" accessibilityState={{ selected: on }} onPress={press} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Tap>
  );
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {chip(t('All'), !lateOnly, () => setLateOnly(false))}
        {chip(t('Late'), lateOnly, () => setLateOnly(true))}
      </View>
      {list.isError ? <ErrorState message={t('Could not load the instalments.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Instalments') }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => {
          const late = isOverdue(item);
          return (
            <Tap accessibilityRole="button" disabled={!canCollect || item.settled} onPress={() => open(item)} style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: item.settled ? theme.border : late ? theme.danger : theme.success, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
                <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
                  {item.customer_name}
                </ThemedText>
                <ThemedText type="bodyMedium" literal style={{ color: late ? theme.danger : theme.text }}>
                  {item.settled ? t('Paid off') : formatBDT(item.outstanding, { dp: 0 })}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                {[item.invoice_number, `${item.instalments_paid}/${item.months}`, item.next_due_date && !item.settled ? `${t('Next')} ${formatBDT(item.next_amount, { dp: 0 })} · ${item.next_due_date}` : '', late ? `${t('Late')} ${formatBDT(item.overdue, { dp: 0 })}` : ''].filter(Boolean).join(' · ')}
              </ThemedText>
            </Tap>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="CheckCircle" title="No instalments" hint="Put a credit sale on instalments from the sale." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
      <BottomSheet visible={plan !== null} onClose={() => setPlan(null)} title={plan ? t('Take a payment from {name}', { name: plan.customer_name }) : ''}>
        <View style={{ gap: Spacing.three }}>
          <Field label="Amount received" required prefix="৳" value={amount} onChangeText={(v) => { setAmount(v); touch(); }} keyboardType="decimal-pad" error={problem ?? undefined} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {PAYMENT_METHODS.map((m) => chip(m.label, method === m.key, () => { setMethod(m.key); touch(); }))}
          </View>
          <Button title="Save payment" variant="success" size="lg" loading={collect.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </View>
  );
}
