import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/customers/logic';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { compareMoney, formatBDT } from '@/lib/money';
import { dayChoice, dayWord } from '@/money/logic';
import { cancelPurchase, confirmPurchase, getPurchase, payPurchase, receivePurchase, returnsOfPurchase } from '@/purchases/api';
import { describePurchaseError, nextSteps, paymentProblem } from '@/purchases/logic';
import { canSendBack } from '@/purchases/returns';
import { itemName } from '@/sell/catalog-map';
import { StatusPill } from '@/purchases/status-pill';
import { showToast } from '@/ui/toast';

/** One order: what was bought and what has arrived, what is owed, and the next step (place it, receive it, pay it, cancel it). */
export default function PurchaseScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const purchase = useQuery({ queryKey: ['purchases', 'one', id], queryFn: () => getPurchase(id), enabled: !!id });
  const p = purchase.data;
  const steps = p ? nextSteps(p, me?.permissions) : null;
  const sentBack = useQuery({ queryKey: ['purchases', 'returns', id], queryFn: () => returnsOfPurchase(id), enabled: !!p && p.status !== 'DRAFT' && p.status !== 'CANCELLED' });

  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const key = useRef<string | null>(null); // one per payment attempt; reused if Save is tapped again after a dropped connection

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['purchases'] });
    void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    void queryClient.invalidateQueries({ queryKey: ['stock'] });
    void queryClient.invalidateQueries({ queryKey: ['home'] });
  };
  const step = useMutation({
    mutationFn: (what: 'confirm' | 'receive' | 'cancel') => (what === 'confirm' ? confirmPurchase(id) : what === 'receive' ? receivePurchase(id) : cancelPurchase(id)),
    onSuccess: (_d, what) => {
      haptics.success();
      showToast({ text: what === 'confirm' ? t('Order placed') : what === 'receive' ? t('Goods are in stock') : t('Order cancelled') });
      refresh();
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describePurchaseError(e)) });
      refresh();
    },
  });
  const pay = useMutation({
    mutationFn: () => payPurchase(id, { amount: amount.trim(), payment_method: method, payment_date: dayChoice('today'), note: note.trim() }, key.current!),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Payment saved.') });
      setPaying(false);
      setAmount('');
      setNote('');
      key.current = null;
      refresh();
    },
    onError: () => haptics.warning(),
  });

  const due = p ? p.due_amount : '0';
  function submitPay() {
    const msg = paymentProblem(amount, due);
    setProblem(msg);
    if (msg) return;
    key.current ??= newIdempotencyKey();
    pay.mutate();
  }
  const edit = (fn: () => void) => () => {
    key.current = null; // an edited payment is a new attempt
    pay.reset();
    fn();
  };
  const ask = (what: 'confirm' | 'receive' | 'cancel') => {
    const text = {
      confirm: [t('Place this order?'), t('The supplier is now owed {amount}. Nothing is in stock yet.', { amount: formatBDT(p?.grand_total ?? '0') }), t('Yes, place it')],
      receive: [t('Did all the goods arrive?'), t('Everything still missing goes into your stock now.'), t('Yes, it arrived')],
      cancel: [t('Cancel this order?'), t('The supplier is no longer owed for it. This cannot be undone.'), t('Yes, cancel it')],
    }[what];
    Alert.alert(text[0], text[1], [{ text: t('Not now'), style: 'cancel' }, { text: text[2], style: what === 'cancel' ? 'destructive' : 'default', onPress: () => step.mutate(what) }]);
  };

  const w = p ? dayWord(p.purchase_date) : null;
  const day = w === null ? '' : w === 'today' ? t('Today') : w === 'yesterday' ? t('Yesterday') : `${w.date} ${MONTHS[lang][w.month]}`;
  const card = { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous' as const, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView ref={scroller} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: paying ? 460 : Spacing.six }} keyboardShouldPersistTaps="handled">
          <Stack.Screen options={{ title: t('Order') }} />
          {purchase.isPending ? <SkeletonRows count={3} /> : null}
          {purchase.isError ? <ErrorState message={t('Could not load this order.')} onRetry={() => void purchase.refetch()} /> : null}
          {p ? (
            <>
              <View style={{ gap: Spacing.one }}>
                <ThemedText type="heading" literal>
                  {p.supplier_name}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted" selectable literal>
                  {p.reference_no} · {day}
                  {p.supplier_invoice_no ? ` · ${p.supplier_invoice_no}` : ''}
                </ThemedText>
                <StatusPill status={p.status} />
              </View>

              <View style={card}>
                <Row label="Total" value={formatBDT(p.grand_total)} strong />
                {compareMoney(p.tax_amount, '0') > 0 ? <Row label="Tax" value={formatBDT(p.tax_amount)} /> : null}
                <Row label="Paid" value={formatBDT(p.paid_amount)} />
                {compareMoney(p.due_amount, '0') > 0 && p.status !== 'CANCELLED' && p.status !== 'DRAFT' ? <Row label="Still due" value={formatBDT(p.due_amount)} danger /> : null}
              </View>

              <View style={card}>
                <ThemedText type="bodyMedium">Items</ThemedText>
                {p.items.map((it, i) => (
                  <View key={it.id} style={{ flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallMedium" literal>
                        {itemName(it.product_name, it.variant_name)}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textMuted" literal>
                        {Number(it.quantity)} × {formatBDT(it.unit_cost)}
                      </ThemedText>
                      {p.status !== 'DRAFT' && p.status !== 'CANCELLED' ? (
                        <ThemedText type="caption" style={{ color: Number(it.outstanding) > 0 ? theme.warning : theme.success }}>
                          {Number(it.outstanding) > 0 ? t('{n} still to come', { n: Number(it.outstanding) }) : t('All arrived')}
                        </ThemedText>
                      ) : null}
                      {Number(it.returned_quantity) > 0 ? (
                        <ThemedText type="caption" themeColor="textMuted">
                          {t('{n} returned to the supplier', { n: Number(it.returned_quantity) })}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText type="smallMedium">{formatBDT(it.line_total)}</ThemedText>
                  </View>
                ))}
              </View>

              {p.note ? (
                <ThemedText type="small" themeColor="textSecondary" literal>
                  {p.note}
                </ThemedText>
              ) : null}

              {steps?.confirm ? <Button title="Place the order" size="lg" loading={step.isPending && step.variables === 'confirm'} disabled={step.isPending} onPress={() => ask('confirm')} /> : null}
              {steps?.receive ? <Button title="Goods arrived" variant="success" size="lg" loading={step.isPending && step.variables === 'receive'} disabled={step.isPending} onPress={() => ask('receive')} /> : null}
              {steps?.pay && !paying ? <Button title="Pay the supplier" variant={steps.receive ? 'secondary' : 'success'} size="lg" onPress={() => setPaying(true)} /> : null}

              {paying ? (
                // The keyboard opens over the lower half of the screen, so the form is brought to the top as it appears.
                <View onLayout={(e) => scroller.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true })} style={{ ...card, gap: Spacing.three }}>
                  <ThemedText type="bodyMedium">Payment for this order</ThemedText>
                  <Field label="Amount you paid" prefix="৳" value={amount} onChangeText={(v) => edit(() => setAmount(v))()} keyboardType="decimal-pad" placeholder="0.00" error={problem ?? undefined} autoFocus />
                  <Tap accessibilityRole="button" onPress={edit(() => setAmount(Number(due).toFixed(2)))} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
                    <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                      {t('Everything due ({amount})', { amount: formatBDT(due) })}
                    </ThemedText>
                  </Tap>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                    {PAYMENT_METHODS.map((m) => {
                      const on = method === m.key;
                      return (
                        <Tap key={m.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={edit(() => setMethod(m.key))} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
                          <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                            {m.label}
                          </ThemedText>
                        </Tap>
                      );
                    })}
                  </View>
                  <Field label="Note (optional)" value={note} onChangeText={(v) => edit(() => setNote(v))()} placeholder="Cheque no, transaction ID…" />
                  {pay.isError ? <Notice>{describePurchaseError(pay.error)}</Notice> : null}
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Button title="Cancel" variant="secondary" onPress={() => { setPaying(false); setProblem(null); key.current = null; pay.reset(); }} style={{ flex: 1 }} />
                    <Button title="Save payment" variant="success" loading={pay.isPending} onPress={submitPay} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : null}

              {sentBack.data?.length ? (
                <View style={card}>
                  <ThemedText type="bodyMedium">Returned to the supplier</ThemedText>
                  {sentBack.data.map((r, i) => {
                    const rw = dayWord(r.return_date);
                    const when = rw === null ? '' : rw === 'today' ? t('Today') : rw === 'yesterday' ? t('Yesterday') : `${rw.date} ${MONTHS[lang][rw.month]}`;
                    return (
                      <View key={r.id} style={{ gap: 2, paddingTop: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
                          <ThemedText type="smallMedium" literal>
                            {r.reference_no} · {when}
                          </ThemedText>
                          <ThemedText type="smallMedium" literal>
                            {formatBDT(r.grand_total)}
                          </ThemedText>
                        </View>
                        <ThemedText type="caption" themeColor="textMuted" literal>
                          {r.items.map((x) => `${Number(x.quantity)} × ${x.product_name}`).join(', ')}
                          {r.reason ? ` · ${r.reason}` : ''}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {canSendBack(p, me?.permissions) ? <Button title="Return to supplier" variant="secondary" onPress={() => router.push({ pathname: '/send-back/[id]', params: { id: p.id } })} /> : null}
              {steps?.cancel ? <Button title="Cancel this order" variant="secondary" disabled={step.isPending} onPress={() => ask('cancel')} /> : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} literal style={danger ? { color: theme.danger } : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}
