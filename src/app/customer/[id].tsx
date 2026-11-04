import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { ErrorState } from '@/components/error-state';
import { Notice } from '@/components/notice';
import { showToast } from '@/ui/toast';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { getCustomer, recordPayment } from '@/customers/api';
import { amountDue, creditLeft, PAYMENT_METHODS, paymentProblem, type PaymentMethod } from '@/customers/logic';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { Tap } from '@/components/tap';

/** One customer's account: what they bought, paid and owe, and a way to take a payment on account. */
export default function CustomerScreen() {
  const theme = useTheme();
  const t = useT();
  const qc = useQueryClient();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canPay = me?.permissions?.includes('customer.payment') ?? false;
  const customer = useQuery({ queryKey: ['customers', 'one', id], queryFn: () => getCustomer(id) });
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const key = useRef(newIdempotencyKey()); // minted once per open dialog and reused on retry

  const c = customer.data;
  const due = c ? amountDue(c.current_balance) : '0.00';
  const left = c ? creditLeft(c.credit_limit, c.current_balance) : null;

  const pay = useMutation({
    mutationFn: () => recordPayment(id, { amount: amount.trim(), payment_method: method, note: note.trim() || `Payment from ${c?.name ?? 'customer'}` }, key.current),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      showToast({ text: t('Payment recorded.') });
      setPaying(false);
      setAmount('');
      setNote('');
      key.current = newIdempotencyKey();
    },
    onError: () => setProblem('Could not record the payment. Check the connection and try again.'),
  });

  function submit() {
    const msg = paymentProblem(amount, due);
    setProblem(msg);
    if (!msg) pay.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView ref={scroller} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: paying ? 460 : Spacing.six }} keyboardShouldPersistTaps="handled">
          <Stack.Screen options={{ title: c?.name ?? 'Customer' }} />
          {c ? (
            <ThemedText type="small" themeColor="textMuted" selectable>
              {c.code}{c.phone ? ` · ${c.phone}` : ''}
            </ThemedText>
          ) : null}

          {customer.isError ? <ErrorState message={t('Could not load this customer.')} onRetry={() => void customer.refetch()} /> : null}
          {c ? (
            <>
              <View style={{ padding: Spacing.four, gap: Spacing.one, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: due === '0.00' ? theme.successSoft : theme.dangerSoft, borderWidth: 1, borderColor: due === '0.00' ? theme.successBorder : theme.dangerBorder }}>
                <ThemedText type="caption" themeColor="textSecondary">
                  Owes now
                </ThemedText>
                <ThemedText type="hero" style={{ color: due === '0.00' ? theme.success : theme.danger }}>
                  {formatBDT(due)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {left === null ? t('No credit limit set') : t('Credit limit {limit} · {left} left', { limit: formatBDT(c.credit_limit), left: formatBDT(left) })}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Stat label="Bought" value={formatBDT(c.total_amount, { dp: 0 })} sub={t('{n} orders', { n: c.order_count })} />
                <Stat label="Paid" value={formatBDT(c.total_paid, { dp: 0 })} />
              </View>

              {canPay && due !== '0.00' && !paying ? <Button title="Record payment" variant="success" size="lg" onPress={() => setPaying(true)} /> : null}
              {paying ? (
                // The keyboard opens over the lower half of the screen, so the form is brought to the top as it appears.
                <View onLayout={(e) => scroller.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true })} style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <ThemedText type="bodyMedium">Payment received</ThemedText>
                  <Field label="Amount received" prefix="৳" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={problem ?? undefined} autoFocus />
                  <Tap accessibilityRole="button" onPress={() => setAmount(due)} style={{ alignSelf: 'flex-start' }}>
                    <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                      {t('Full amount ({amount})', { amount: formatBDT(due) })}
                    </ThemedText>
                  </Tap>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                    {PAYMENT_METHODS.map((m) => {
                      const on = method === m.key;
                      return (
                        <Tap key={m.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setMethod(m.key)} style={{ overflow: 'hidden', minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
                          <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                            {m.label}
                          </ThemedText>
                        </Tap>
                      );
                    })}
                  </View>
                  <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Cheque no, transaction ID…" />
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Button title="Cancel" variant="secondary" onPress={() => { setPaying(false); setProblem(null); }} style={{ flex: 1 }} />
                    <Button title="Save payment" variant="success" loading={pay.isPending} onPress={submit} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : null}
              {pay.isSuccess && !paying ? <Notice kind="info">{"Payment recorded. It is kept on the customer's account."}</Notice> : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: Spacing.three, gap: 2, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
      </ThemedText>
      <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      {sub ? (
        <ThemedText type="caption" themeColor="textMuted">
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}
