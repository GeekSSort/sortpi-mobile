import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Step } from '@/components/quantity-step';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { Pill } from '@/products/variant-card';
import { formatQuantity } from '@/stock/status';
import { useStatusLook } from '@/transfers/look';
import { dispatchTransfer, getTransfer, receiveTransfer, undoDispatch } from '@/transfers/api';
import { receiveBody, receiveProblem, setAmount, startAmounts, stepAmount, stillMissing, takesAll, waiting, type Arrived } from '@/transfers/receive';
import { alreadyDone, ASK, describeTransferError, nextMoves, outstanding, type Move, type Transfer, type TransferItem } from '@/transfers/logic';
import { showToast } from '@/ui/toast';


const RUN: Record<Move, (id: string, body?: ReturnType<typeof receiveBody>) => Promise<Transfer>> = { dispatch: dispatchTransfer, receive: receiveTransfer, undo: undoDispatch };

/** One transfer: where it goes, what is in it, how much has arrived, and the next step. Each step asks first. */
export default function TransferScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useSession();
  const queryClient = useQueryClient();
  const look = useStatusLook();
  const q = useQuery({ queryKey: ['transfer', id], queryFn: () => getTransfer(id), enabled: !!id && !!me?.permissions?.includes('inventory.transfer') });
  const tr = q.data;
  const [sheet, setSheet] = useState(false);
  const [arrived, setArrived] = useState<Arrived>({});
  const moves = tr ? nextMoves(tr, me?.permissions) : [];

  const run = useMutation({
    mutationFn: (v: { move: Move; body?: ReturnType<typeof receiveBody> }) => RUN[v.move](id, v.body),
    onSuccess: (_d, v) => {
      const m = v.move;
      setSheet(false);
      haptics.success();
      showToast({ text: t(ASK[m].done) });
      for (const k of ['transfer', 'transfers', 'transfers-totals', 'stock', 'movements', 'movements-totals', 'expiry']) void queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: async (e, v) => {
      const m = v.move;
      haptics.warning();
      // A lost connection may have lost only the answer. The status now says whether it went through, so it is read again before anything is offered twice.
      const fresh = await q.refetch();
      if (fresh.data && alreadyDone(m, fresh.data.status)) {
        showToast({ text: t(ASK[m].done) });
        return;
      }
      showToast({ text: t(describeTransferError(e)) });
    },
  });

  if (!me?.permissions?.includes('inventory.transfer')) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const ask = (m: Move) => {
    if (!tr) return;
    const a = ASK[m];
    const vars = { from: tr.from_warehouse_name, to: tr.to_warehouse_name };
    Alert.alert(t(a.title), t(a.body, vars), [{ text: t('Not now'), style: 'cancel' }, { text: t(a.button), style: a.danger ? 'destructive' : 'default', onPress: () => run.mutate({ move: m }) }]);
  };
  const openPart = () => {
    if (!tr) return;
    setArrived(startAmounts(tr.items));
    setSheet(true);
  };
  const savePart = () => {
    if (!tr || run.isPending) return;
    if (receiveProblem(arrived)) return;
    Alert.alert(t('Add what arrived?'), t('These amounts will be added to the stock of {to}. What is missing stays on the way. This cannot be undone.', { to: tr.to_warehouse_name }), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, add them'), onPress: () => run.mutate({ move: 'receive', body: receiveBody(arrived) }) }]);
  };
  const when = (iso: string) => {
    const w = saleWhen(iso);
    const day = w.day === 'today' ? t('Today') : w.day === 'yesterday' ? t('Yesterday') : `${w.day.date} ${MONTHS[lang][w.day.month]}`;
    return `${day}, ${w.time}`;
  };
  const s = tr ? look(tr.status) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: tr?.reference_no ?? t('Transfer') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />} contentContainerStyle={{ gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {q.isError ? <ErrorState message={t(describeTransferError(q.error))} onRetry={() => void q.refetch()} /> : null}
        {!tr ? (
          q.isPending ? <SkeletonRows /> : null
        ) : (
          <>
            <View style={{ gap: 12, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              {s ? <Pill icon={s.icon} text={t(s.words)} fg={s.fg} soft={s.soft} line={s.line} /> : null}
              <View style={{ gap: 2 }}>
                <ThemedText type="caption" themeColor="textMuted">
                  From
                </ThemedText>
                <ThemedText type="bodyMedium" literal>
                  {place(tr, 'from')}
                </ThemedText>
              </View>
              <Icon name="ArrowRight" size={18} color={theme.textMuted} />
              <View style={{ gap: 2 }}>
                <ThemedText type="caption" themeColor="textMuted">
                  To
                </ThemedText>
                <ThemedText type="bodyMedium" literal>
                  {place(tr, 'to')}
                </ThemedText>
              </View>
              {tr.dispatched_at ? (
                <ThemedText type="caption" themeColor="textMuted" literal>
                  {t('Sent {when}', { when: when(tr.dispatched_at) })}
                </ThemedText>
              ) : null}
              {tr.received_at ? (
                <ThemedText type="caption" themeColor="textMuted" literal>
                  {t('Arrived {when}', { when: when(tr.received_at) })}
                </ThemedText>
              ) : null}
              {tr.total_value ? (
                <ThemedText type="caption" themeColor="textMuted" literal>
                  {t('Worth {amount}', { amount: formatBDT(tr.total_value, { dp: 0 }) })}
                </ThemedText>
              ) : null}
              {tr.note ? (
                <ThemedText type="small" themeColor="textSecondary" literal>
                  {tr.note}
                </ThemedText>
              ) : null}
            </View>

            <View style={{ borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              {tr.items.map((i, n) => (
                <Line key={i.id} i={i} last={n === tr.items.length - 1} showArrived={tr.status !== 'DRAFT'} />
              ))}
            </View>

            {moves.length ? (
              <View style={{ gap: Spacing.two }}>
                {moves.includes('dispatch') ? <Button title="Send it" size="lg" variant="success" loading={run.isPending && run.variables?.move === 'dispatch'} disabled={run.isPending} onPress={() => ask('dispatch')} /> : null}
                {moves.includes('receive') ? <Button title="It all arrived" size="lg" variant="success" loading={run.isPending && run.variables?.move === 'receive' && !sheet} disabled={run.isPending} onPress={() => ask('receive')} /> : null}
                {moves.includes('receive') ? <Button title="Only some arrived" variant="secondary" disabled={run.isPending} onPress={openPart} /> : null}
                {moves.includes('undo') ? <Button title="Take it back" variant="secondary" loading={run.isPending && run.variables?.move === 'undo'} disabled={run.isPending} onPress={() => ask('undo')} /> : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
      <BottomSheet visible={sheet} onClose={() => !run.isPending && setSheet(false)} title="How many arrived?">
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
          {tr
            ? waiting(tr.items).map((i) => {
                const name = i.variant_name && i.variant_name.toLowerCase() !== 'default' ? `${i.product_name} ${i.variant_name}` : i.product_name;
                return (
                  <View key={i.id} style={{ gap: Spacing.two }}>
                    <ThemedText type="bodyMedium" literal numberOfLines={2}>
                      {name}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted" literal>
                      {t('{n} still on the way', { n: `${formatQuantity(outstanding(i), i.unit_allow_decimal)}${i.unit_short_name ? ` ${i.unit_short_name}` : ''}` })}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                      <Step icon="Minus" label={t('Fewer {name}', { name })} disabled={Number(arrived[i.id] || 0) <= 0} onPress={() => setArrived((a) => stepAmount(a, i, -1))} />
                      <View style={{ flex: 1 }}>
                        <Field label="How many arrived" value={arrived[i.id] ?? ''} onChangeText={(v) => setArrived((a) => setAmount(a, i, v))} keyboardType={i.unit_allow_decimal ? 'decimal-pad' : 'number-pad'} />
                      </View>
                      <Step icon="Plus" label={t('More {name}', { name })} disabled={Number(arrived[i.id] || 0) >= Number(outstanding(i))} onPress={() => setArrived((a) => stepAmount(a, i, 1))} />
                    </View>
                  </View>
                );
              })
            : null}
          {tr && !takesAll(tr.items, arrived) && !receiveProblem(arrived) ? (
            <Notice kind="info">{t('{n} will still be on the way.', { n: stillMissing(tr.items, arrived) })}</Notice>
          ) : null}
          {receiveProblem(arrived) ? <Notice>{t(receiveProblem(arrived) ?? '')}</Notice> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.two, paddingBottom: Spacing.two }}>
            <Button title="Cancel" variant="secondary" disabled={run.isPending} onPress={() => setSheet(false)} style={{ flex: 1 }} />
            <Button title="Add what arrived" variant="success" loading={run.isPending} disabled={!!receiveProblem(arrived)} onPress={savePart} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

/** The shelf, with its branch in front only when the goods cross between branches. */
const place = (tr: Transfer, end: 'from' | 'to') => {
  const crosses = tr.from_branch_name !== tr.to_branch_name;
  const branch = end === 'from' ? tr.from_branch_name : tr.to_branch_name;
  const shelf = end === 'from' ? tr.from_warehouse_name : tr.to_warehouse_name;
  return crosses && branch ? `${branch} · ${shelf}` : shelf;
};

function Line({ i, last, showArrived }: { i: TransferItem; last: boolean; showArrived: boolean }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const left = outstanding(i);
  const done = Number(left) <= 0;
  const unit = i.unit_short_name ? ` ${i.unit_short_name}` : '';
  const name = i.variant_name && i.variant_name.toLowerCase() !== 'default' ? `${i.product_name} ${i.variant_name}` : i.product_name;
  return (
    <View style={{ gap: 6, padding: Spacing.three, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'center' }}>
        <ThemedText type="bodyMedium" literal style={{ flex: 1 }} numberOfLines={2}>
          {name}
        </ThemedText>
        <ThemedText type="bodyMedium" literal style={{ fontVariant: ['tabular-nums'] }}>
          {`${formatQuantity(i.quantity, i.unit_allow_decimal)}${unit}`}
        </ThemedText>
      </View>
      {showArrived ? (
        <Pill icon={done ? 'CheckCircle' : 'ArrowUpRight'} text={done ? t('All arrived') : t('{n} still on the way', { n: formatQuantity(left, i.unit_allow_decimal) })} fg={done ? theme.success : theme.warning} soft={done ? theme.successSoft : theme.warningSoft} line={done ? theme.successBorder : `${theme.warning}55`} />
      ) : null}
    </View>
  );
}
