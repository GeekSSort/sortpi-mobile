import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/customers/logic';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { compareMoney, formatBDT } from '@/lib/money';
import { cancelOrder, getOrder, handOver, markReady, takeDeposit, type CustomerOrder } from '@/orders/api';
import { OrderPills } from '@/orders/look';
import { alreadyDeposited, collectBody, depositBody, depositProblem, describeOrderError, orderSteps } from '@/orders/logic';
import { showToast } from '@/ui/toast';

const money = (v: string) => formatBDT(v);

/** One order: who, what, the day, what has been paid and what is left, and the next step (deposit, ready, hand over, cancel). */
export default function OrderScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useQuery({ queryKey: ['orders', 'one', id], queryFn: () => getOrder(id), enabled: !!id });
  const o = order.data;
  const steps = o ? orderSteps(o, me?.permissions) : null;
  const [sheet, setSheet] = useState<'deposit' | 'collect' | 'cancel' | null>(null);

  const refresh = () => {
    for (const k of ['orders', 'sales', 'sale', 'home', 'customers', 'customer']) void queryClient.invalidateQueries({ queryKey: [k] });
  };
  const ready = useMutation({
    mutationFn: () => markReady(id),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Marked ready to collect') });
      refresh();
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeOrderError(e)) });
      refresh();
    },
  });

  const [y, m, d] = (o?.due_date ?? '2000-01-01').split('-').map(Number);
  const dueText = `${d} ${MONTHS[lang][m - 1]} ${y}`;
  const card = { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous' as const, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => void order.refetch()} />} style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Order') }} />
      {order.isPending ? <SkeletonRows count={3} /> : null}
      {order.isError ? <ErrorState message={t('Could not load this order.')} onRetry={() => void order.refetch()} /> : null}
      {o ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="heading" literal>
              {o.customer_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted" selectable literal>
              {o.reference_no}
              {o.customer_phone ? ` · ${o.customer_phone}` : ''}
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <OrderPills order={o} />
            </View>
            {o.customer_phone ? (
              <Tap accessibilityRole="button" accessibilityLabel={t('Call {phone}', { phone: o.customer_phone })} onPress={() => void Linking.openURL(`tel:${o.customer_phone}`)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: theme.brandSoftBorder, backgroundColor: theme.brandSoft }}>
                <Icon name="Phone" size={20} color={theme.brandText} />
                <ThemedText type="smallMedium" style={{ color: theme.brandText }} literal>
                  {t('Call {phone}', { phone: o.customer_phone })}
                </ThemedText>
              </Tap>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <ToneTile label="Total" icon="Receipt" value={money(o.grand_total)} />
            <ToneTile label="Paid already" icon="CheckCircle" tone="good" value={money(o.deposit_paid)} />
          </View>
          <ToneTile label="Still to pay" icon={compareMoney(o.balance, '0') > 0 && o.status !== 'CANCELLED' && o.status !== 'COLLECTED' ? 'TriangleAlert' : 'CheckCircle'} tone={compareMoney(o.balance, '0') > 0 && o.status !== 'CANCELLED' && o.status !== 'COLLECTED' ? 'bad' : 'good'} value={o.status === 'COLLECTED' ? money('0') : money(o.balance)} />

          <View style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name="Package" size={22} color={theme.brandText} />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" themeColor="textMuted">
                To be collected on
              </ThemedText>
              <ThemedText type="bodyMedium" literal>
                {dueText}
              </ThemedText>
            </View>
          </View>

          <View style={card}>
            <ThemedText type="bodyMedium">Items</ThemedText>
            {o.items.map((it, i) => (
              <View key={it.id} style={{ flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallMedium" literal>
                    {it.product_name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" literal>
                    {`${Number(it.quantity)} × ${money(it.unit_price)}`}
                  </ThemedText>
                </View>
                <ThemedText type="smallMedium" literal>
                  {money(it.line_total)}
                </ThemedText>
              </View>
            ))}
          </View>

          {o.note ? (
            <ThemedText type="small" themeColor="textSecondary" literal>
              {o.note}
            </ThemedText>
          ) : null}
          {o.status === 'CANCELLED' ? <Notice kind="info">{o.cancel_reason ? t('This order was cancelled: {reason}', { reason: o.cancel_reason }) : t('This order was cancelled.')}</Notice> : null}
          {o.status === 'COLLECTED' && o.sale_id ? <Button title={t('See the sale {n}', { n: o.sale_invoice ?? '' })} variant="secondary" onPress={() => router.push({ pathname: '/sale/[id]', params: { id: o.sale_id! } })} /> : null}

          {steps?.ready ? <Button title="Mark ready to collect" size="lg" loading={ready.isPending} onPress={() => ready.mutate()} /> : null}
          {steps?.collect ? <Button title="Hand it over" variant="success" size="lg" onPress={() => setSheet('collect')} /> : null}
          {steps?.deposit ? <Button title="Take some money now" variant="secondary" onPress={() => setSheet('deposit')} /> : null}
          {steps?.cancel ? <Button title="Cancel this order" variant="secondary" onPress={() => setSheet('cancel')} /> : null}
        </>
      ) : null}

      {o && sheet === 'deposit' ? <DepositSheet order={o} onClose={() => setSheet(null)} onDone={refresh} /> : null}
      {o && sheet === 'collect' ? <CollectSheet order={o} onClose={() => setSheet(null)} onDone={refresh} /> : null}
      {o && sheet === 'cancel' ? <CancelSheet order={o} onClose={() => setSheet(null)} onDone={refresh} /> : null}
    </ScrollView>
  );
}

function Methods({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
      {PAYMENT_METHODS.map((m) => {
        const on = value === m.key;
        return (
          <Tap key={m.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(m.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border }}>
            <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
              {t(m.label)}
            </ThemedText>
          </Tap>
        );
      })}
    </View>
  );
}

function DepositSheet({ order, onClose, onDone }: { order: CustomerOrder; onClose: () => void; onDone: () => void }) {
  const { t } = usePrefs();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // Set when a try lost its connection: this call is not safe to repeat, so the order is read first.
  const unsure = useRef<{ paid: string; amount: string } | null>(null);
  const done = () => {
    haptics.success();
    showToast({ text: t('Money taken') });
    onDone();
    onClose();
  };
  const save = useMutation({
    mutationFn: () => takeDeposit(order.id, depositBody(amount, method)),
    onSuccess: done,
    onError: (e) => {
      haptics.warning();
      if (e instanceof ApiError && (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT')) unsure.current = { paid: order.deposit_paid, amount: amount.trim() };
    },
  });

  async function submit() {
    const msg = depositProblem(amount, order.balance);
    setProblem(msg);
    if (msg) return;
    if (unsure.current) {
      setChecking(true);
      try {
        const fresh = await getOrder(order.id);
        if (alreadyDeposited(unsure.current.paid, fresh.deposit_paid, unsure.current.amount)) {
          unsure.current = null;
          done();
          return;
        }
      } catch {
        setProblem('Could not check the order. Check your connection and try again.');
        return;
      } finally {
        setChecking(false);
      }
    }
    save.mutate();
  }
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title="Take some money now">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary" literal>
          {t('Still to pay: {amount}', { amount: money(order.balance) })}
        </ThemedText>
        <Field label="Amount paid" prefix="৳" value={amount} onChangeText={(v) => { setAmount(v); setProblem(null); save.reset(); }} keyboardType="decimal-pad" error={problem ? t(problem) : undefined} autoFocus />
        <Tap accessibilityRole="button" onPress={() => setAmount(Number(order.balance).toFixed(2))} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <ThemedText type="smallMedium" style={{ color: '#2563eb' }}>
            {t('Everything left ({amount})', { amount: money(order.balance) })}
          </ThemedText>
        </Tap>
        <Methods value={method} onChange={setMethod} />
        {save.isError ? <Notice>{describeOrderError(save.error)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={save.isPending || checking} onPress={() => void submit()} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}

function CollectSheet({ order, onClose, onDone }: { order: CustomerOrder; onClose: () => void; onDone: () => void }) {
  const { t } = usePrefs();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const owes = compareMoney(order.balance, '0') > 0;
  const save = useMutation({
    mutationFn: () => handOver(order.id, collectBody(order.balance, method)),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Handed over') });
      onDone();
      onClose();
    },
    onError: () => haptics.warning(),
  });
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title="Hand it over">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary">
          {owes ? 'The customer pays what is left, and the order becomes a sale.' : 'It is all paid. The order becomes a sale.'}
        </ThemedText>
        {owes ? (
          <>
            <ThemedText type="title" literal>
              {money(order.balance)}
            </ThemedText>
            <Methods value={method} onChange={setMethod} />
          </>
        ) : null}
        {save.isError ? <Notice>{describeOrderError(save.error)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Not now" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title={owes ? 'Take the money and hand over' : 'Hand it over'} variant="success" loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1.4 }} />
        </View>
      </View>
    </BottomSheet>
  );
}

function CancelSheet({ order, onClose, onDone }: { order: CustomerOrder; onClose: () => void; onDone: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => cancelOrder(order.id, reason.trim()),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Order cancelled') });
      onDone();
      onClose();
    },
    onError: () => haptics.warning(),
  });
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title="Cancel this order?">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        {compareMoney(order.deposit_paid, '0') > 0 ? (
          <View style={{ flexDirection: 'row', gap: 8, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: `${theme.warning}55` }}>
            <Icon name="TriangleAlert" size={20} color={theme.warning} />
            <ThemedText type="small" style={{ flex: 1, color: theme.warning }} literal>
              {t('{amount} was already paid. It stays on the customer’s account.', { amount: money(order.deposit_paid) })}
            </ThemedText>
          </View>
        ) : null}
        <Field label="Why? (optional)" value={reason} onChangeText={setReason} placeholder="For example: customer changed their mind" />
        {save.isError ? <Notice>{describeOrderError(save.error)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Not now" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Yes, cancel it" variant="primary" loading={save.isPending} onPress={() => save.mutate()} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}
