import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/customers/logic';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { getSupplier, paySupplier, supplierLedger, type LedgerRow } from '@/suppliers/api';
import { describeSupplierError, ledgerWords, owesMore, payProblem, weOwe } from '@/suppliers/logic';
import { showToast } from '@/ui/toast';

/** One supplier's account: what you owe, what you bought and paid, the latest lines, and a way to pay them. */
export default function SupplierScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canPay = me?.permissions?.includes('supplier.payment') ?? false;
  const canSeeLedger = me?.permissions?.includes('supplier.view_ledger') ?? false;
  const supplier = useQuery({ queryKey: ['suppliers', 'one', id], queryFn: () => getSupplier(id), enabled: !!id });
  const ledger = useQuery({ queryKey: ['suppliers', 'ledger', id], queryFn: () => supplierLedger(id), enabled: !!id && canSeeLedger });
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const key = useRef<string | null>(null); // one per payment attempt; reused if Save is tapped again after a dropped connection

  const s = supplier.data;
  const owed = s ? weOwe(s.current_balance) : '0.00';

  const pay = useMutation({
    mutationFn: () => paySupplier(id, { amount: amount.trim(), payment_method: method, note: note.trim() || `Payment to ${s?.name ?? 'supplier'}` }, key.current!),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Payment saved.') });
      setPaying(false);
      setAmount('');
      setNote('');
      key.current = null;
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: () => haptics.warning(),
  });

  function submit() {
    const msg = payProblem(amount, owed);
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView ref={scroller} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: paying ? 460 : Spacing.six }} keyboardShouldPersistTaps="handled">
          <Stack.Screen options={{ title: t('Supplier') }} />
          {supplier.isPending ? <SkeletonRows count={3} /> : null}
          {supplier.isError ? <ErrorState message={t('Could not load this supplier.')} onRetry={() => void supplier.refetch()} /> : null}
          {s ? (
            <>
              <View style={{ gap: 2 }}>
                <ThemedText type="heading" literal>
                  {s.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted" selectable literal>
                  {s.code}
                  {s.phone ? ` · ${s.phone}` : ''}
                  {s.contact_person ? ` · ${s.contact_person}` : ''}
                </ThemedText>
              </View>

              <View style={{ padding: Spacing.four, gap: Spacing.one, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: owed === '0.00' ? theme.successSoft : theme.dangerSoft, borderWidth: 1, borderColor: owed === '0.00' ? theme.successBorder : theme.dangerBorder }}>
                <ThemedText type="caption" themeColor="textSecondary">
                  You owe now
                </ThemedText>
                <ThemedText type="hero" style={{ color: owed === '0.00' ? theme.success : theme.danger }}>
                  {formatBDT(owed)}
                </ThemedText>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Stat label="Bought" value={formatBDT(s.total_purchases, { dp: 0 })} />
                <Stat label="Paid" value={formatBDT(s.total_paid, { dp: 0 })} />
              </View>

              {s.phone ? (
                <Button title={`${t('Call')} ${s.phone}`} variant="secondary" onPress={() => void Linking.openURL(`tel:${s.phone}`)} />
              ) : null}

              {canPay && owed !== '0.00' && !paying ? <Button title="Pay this supplier" variant="success" size="lg" onPress={() => setPaying(true)} /> : null}
              {paying ? (
                // The keyboard opens over the lower half of the screen, so the form is brought to the top as it appears.
                <View onLayout={(e) => scroller.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true })} style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <ThemedText type="bodyMedium">Payment to the supplier</ThemedText>
                  <Field label="Amount you paid" prefix="৳" value={amount} onChangeText={(v) => edit(() => setAmount(v))()} keyboardType="decimal-pad" placeholder="0.00" error={problem ?? undefined} autoFocus />
                  <Tap accessibilityRole="button" onPress={edit(() => setAmount(owed))} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
                    <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                      {t('Everything I owe ({amount})', { amount: formatBDT(owed) })}
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
                  {pay.isError ? <Notice>{describeSupplierError(pay.error)}</Notice> : null}
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Button title="Cancel" variant="secondary" onPress={() => { setPaying(false); setProblem(null); key.current = null; pay.reset(); }} style={{ flex: 1 }} />
                    <Button title="Save payment" variant="success" loading={pay.isPending} onPress={submit} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : null}

              {canSeeLedger ? (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText type="bodyMedium">Latest on the account</ThemedText>
                  {ledger.isPending ? <SkeletonRows count={2} /> : null}
                  {ledger.isError ? <ErrorState message={t('Could not load the account.')} onRetry={() => void ledger.refetch()} /> : null}
                  {ledger.data && ledger.data.length === 0 ? <Notice kind="info">Nothing has been bought from or paid to this supplier yet.</Notice> : null}
                  {ledger.data && ledger.data.length > 0 ? (
                    <View style={{ borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.three }}>
                      {ledger.data.map((r, i) => (
                        <LedgerLine key={r.id} row={r} first={i === 0} lang={lang} />
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function LedgerLine({ row, first, lang }: { row: LedgerRow; first: boolean; lang: 'en' | 'bn' }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const more = owesMore(row.amount);
  const when = saleWhen(row.created_at);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const abs = formatBDT(row.amount.replace('-', ''));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: first ? 0 : 1, borderTopColor: theme.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: more ? theme.dangerSoft : theme.successSoft }}>
        <Icon name={more ? 'ArrowUpRight' : 'ArrowDownLeft'} size={16} color={more ? theme.danger : theme.success} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallMedium">{ledgerWords(row.transaction_type)}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {day} · {row.note}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="smallMedium" style={{ color: more ? theme.danger : theme.success }}>
          {more ? '+' : '−'} {abs}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {t('Owed after: {amount}', { amount: formatBDT(weOwe(row.balance_after), { dp: 0 }) })}
        </ThemedText>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: Spacing.three, gap: 2, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
      </ThemedText>
      <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}
