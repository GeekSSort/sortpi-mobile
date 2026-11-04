import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, useColorScheme, View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Step } from '@/components/quantity-step';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { PayColors } from '@/constants/palette';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { createReturn, getSale, previewReturn, type Sale } from '@/sales/api';
import { isWalkIn } from '@/sales/logic';
import { canReturn, chosenLines, describeReturnError, mustPayFirst, previewBody, previewFacts, returnable, returnBody, stepQuantity, type RefundMethod, type Tender } from '@/sales/returns';

const WAYS: { id: Tender; label: string; icon: 'Cash' | 'Phone' | 'CreditCard' | 'Bank' }[] = [
  { id: 'CASH', label: 'Cash', icon: 'Cash' },
  { id: 'MOBILE', label: 'Mobile', icon: 'Phone' },
  { id: 'CARD', label: 'Card', icon: 'CreditCard' },
  { id: 'BANK', label: 'Bank', icon: 'Bank' },
];

/** Take goods back from a sale: choose what comes back and how many, see what the server says it comes to, then confirm. */
export default function ReturnScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sale = useQuery({ queryKey: ['sale', id], queryFn: () => getSale(id), enabled: !!id });
  const allowed = me?.permissions?.includes('sale.refund') ?? false;
  // Kept here, not in the form: saving refreshes the sale, nothing is left to return, and the form goes away while the result is still showing.
  const [done, setDone] = useState<{ reference: string; refund: string } | null>(null);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      {sale.isPending ? <SkeletonRows count={3} /> : null}
      {sale.isError ? <ErrorState message={t('Could not load this sale.')} onRetry={() => void sale.refetch()} /> : null}
      {done ? <Done done={done} /> : null}
      {!done && sale.data && !allowed ? <Notice>You do not have permission to do that.</Notice> : null}
      {!done && sale.data && allowed && !canReturn(sale.data) ? <Notice kind="info">Nothing is left to send back from this sale.</Notice> : null}
      {!done && sale.data && allowed && canReturn(sale.data) ? <Form sale={sale.data} onDone={setDone} /> : null}
    </ScrollView>
  );
}

function Form({ sale, onDone }: { sale: Sale; onDone: (d: { reference: string; refund: string }) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<RefundMethod>('CASH');
  const [restWay, setRestWay] = useState<Tender>('CASH');
  const [reason, setReason] = useState('');
  const key = useRef<string | null>(null);
  const walkIn = isWalkIn(sale.customer_name);
  const lines = chosenLines(chosen);
  const signature = lines.map((l) => `${l.sale_item_id}:${l.quantity}`).join(',');

  // The server works out the value, what it takes off a due, and what is given back: the phone only shows it.
  const preview = useQuery({ queryKey: ['return-preview', sale.id, method, signature], queryFn: () => previewReturn(sale.id, previewBody(chosen, method)), enabled: lines.length > 0, staleTime: 0, retry: false });
  const facts = preview.data ? previewFacts(preview.data) : null;
  const blocked = mustPayFirst(preview.data, sale.due_amount);

  const save = useMutation({
    mutationFn: () => createReturn(sale.id, returnBody({ chosen, method, reason, today: localDateISO(), payRest: facts?.payRest ? { amount: facts.payRest, method: restWay } : null }), key.current!),
    onSuccess: (r) => {
      haptics.success();
      onDone({ reference: r.reference_no, refund: r.refund_amount });
      // The sale, the lists, the day's figures, stock and what customers owe all just changed.
      for (const k of ['sale', 'sales', 'home', 'stock', 'customers', 'setup-count']) void queryClient.invalidateQueries({ queryKey: [k] });
    },
    onError: () => haptics.warning(),
  });

  function confirm() {
    key.current ??= newIdempotencyKey(); // one key per attempt; a retry after a dropped connection reuses it
    const text = facts?.giveBack ? t('Stock goes back on the shelf and {amount} is given back.', { amount: formatBDT(facts.giveBack) }) : t('Stock goes back on the shelf.');
    Alert.alert(t('Send these goods back?'), text, [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, send back'), onPress: () => save.mutate() }]);
  }

  function change(itemId: string, q: string) {
    key.current = null; // a different return is a different attempt
    save.reset();
    setChosen((c) => ({ ...c, [itemId]: q }));
  }

  return (
    <>
      <View style={{ gap: Spacing.one }}>
        <ThemedText type="heading">What is coming back?</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{t('Invoice {n}', { n: sale.invoice_number })}{walkIn ? '' : ` · ${sale.customer_name}`}</ThemedText>
      </View>

      <View style={{ borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.three }}>
        {sale.items.map((it, i) => {
          const left = returnable(it);
          const q = chosen[it.id] ?? '0';
          const none = Number(left) <= 0;
          return (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border, opacity: none ? 0.5 : 1 }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallMedium" numberOfLines={2} literal>{it.product_name}</ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {none ? t('All sent back already') : t('Up to {n} can come back', { n: Number(left) })}
                </ThemedText>
              </View>
              {none ? null : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Step icon="Minus" label={t('Fewer {name}', { name: it.product_name })} disabled={Number(q) <= 0} onPress={() => change(it.id, stepQuantity(q, -1, left, it.unit_allow_decimal))} />
                  <View style={{ minWidth: 44, alignItems: 'center' }}>
                    <ThemedText type="bodyMedium" style={{ color: Number(q) > 0 ? theme.brandText : theme.textMuted }}>{Number(q)}</ThemedText>
                  </View>
                  <Step icon="Plus" label={t('More {name}', { name: it.product_name })} disabled={Number(q) >= Number(left)} onPress={() => change(it.id, stepQuantity(q, 1, left, it.unit_allow_decimal))} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ gap: Spacing.two }}>
        <ThemedText type="smallMedium">How do you give the money back?</ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {WAYS.map((w) => (
            <WayTile key={w.id} way={w} on={method === w.id} onPress={() => { key.current = null; setMethod(w.id); }} />
          ))}
        </View>
        {walkIn ? null : (
          <Tap accessibilityRole="button" accessibilityState={{ selected: method === 'CREDIT' }} onPress={() => { key.current = null; setMethod(method === 'CREDIT' ? 'CASH' : 'CREDIT'); }} style={{ overflow: 'hidden', minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: method === 'CREDIT' ? theme.brand : theme.inputBorder, backgroundColor: method === 'CREDIT' ? theme.brandSoft : theme.card }}>
            <ThemedText type="smallMedium" style={{ color: method === 'CREDIT' ? theme.brandText : theme.textSecondary, textAlign: 'center' }}>
              {t("Keep it on {name}'s account instead", { name: sale.customer_name })}
            </ThemedText>
          </Tap>
        )}
      </View>

      <Field label="Why is it coming back? (optional)" value={reason} onChangeText={setReason} placeholder="For example: damaged, wrong item" />

      {lines.length === 0 ? <Notice kind="info">Choose how many of each item are coming back.</Notice> : null}
      {lines.length > 0 && preview.isPending ? <SkeletonRows count={2} /> : null}
      {preview.isError ? <Notice>{describeReturnError(preview.error)}</Notice> : null}

      {facts ? (
        <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
          <Line label="Goods are worth" value={formatBDT(facts.worth)} />
          {facts.offDue ? <Line label="Taken off what they owe" value={formatBDT(facts.offDue)} /> : null}
          {facts.onAccount ? <Line label="Kept on their account" value={formatBDT(facts.onAccount)} /> : null}
          {facts.giveBack ? <Line label="You give back" value={formatBDT(facts.giveBack)} strong tone={theme.success} /> : null}
          {facts.payRest ? <Line label="They must still pay" value={formatBDT(facts.payRest)} strong tone={theme.danger} /> : null}
        </View>
      ) : null}

      {facts?.payRest ? (
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="small" themeColor="textSecondary">These goods are worth less than the customer owes. They pay the rest now. How?</ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {WAYS.map((w) => (
              <WayTile key={w.id} way={w} on={restWay === w.id} onPress={() => setRestWay(w.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {blocked ? <Notice>This sale still has money owed, and this shop gives money back only on paid sales. Take the payment first, then send the goods back.</Notice> : null}
      {save.isError ? <Notice>{describeReturnError(save.error)}</Notice> : null}

      <Button title="Take the goods back" variant="success" size="lg" loading={save.isPending} disabled={lines.length === 0 || !preview.data || blocked} onPress={confirm} />
    </>
  );
}

function Done({ done }: { done: { reference: string; refund: string } }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  return (
    <View style={{ alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Check" size={40} color={theme.onBrand} />
      </View>
      <ThemedText type="heading">Goods are back in stock</ThemedText>
      {Number(done.refund) > 0 ? <ThemedText type="title">{formatBDT(done.refund)}</ThemedText> : null}
      {Number(done.refund) > 0 ? <ThemedText type="small" themeColor="textSecondary">Given back to the customer</ThemedText> : null}
      <ThemedText type="caption" themeColor="textMuted">{t('Return {n}', { n: done.reference })}</ThemedText>
      <Button title="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: Spacing.two }} />
    </View>
  );
}

function WayTile({ way, on, onPress }: { way: (typeof WAYS)[number]; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const dark = useColorScheme() === 'dark';
  const pay = PayColors[way.id];
  const ink = dark ? pay.ink.dark : pay.ink.light;
  return (
    <Tap accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={{ overflow: 'hidden', flex: 1, minHeight: 64, gap: 2, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? pay.fill : ink, backgroundColor: on ? pay.fill : theme.card }}>
      <Icon name={way.icon} size={22} color={on ? theme.onBrand : ink} />
      <ThemedText type="smallMedium" style={{ color: on ? theme.onBrand : ink }}>{t(way.label)}</ThemedText>
    </Tap>
  );
}

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? 'text' : 'textSecondary'} style={{ flex: 1 }}>{label}</ThemedText>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} style={tone ? { color: tone } : undefined}>{value}</ThemedText>
    </View>
  );
}
