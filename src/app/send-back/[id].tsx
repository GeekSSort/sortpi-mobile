import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Step } from '@/components/quantity-step';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { getPurchase, sendGoodsBack, type Purchase } from '@/purchases/api';
import { alreadySent, canSendBack, chosenLines, describeSendBackError, estimateCredit, returnBody, sendable } from '@/purchases/returns';
import { itemName } from '@/sell/catalog-map';
import { stepQuantity } from '@/sales/returns';

type Result = { reference: string | null; credit: string | null };

/** Send goods back to the supplier: choose what and how many, see about what it is worth, confirm. The server prices it at the cost the goods came in at. */
export default function SendBackScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const purchase = useQuery({ queryKey: ['purchases', 'one', id], queryFn: () => getPurchase(id), enabled: !!id });
  const p = purchase.data;
  const allowed = me?.permissions?.includes('purchase.return') ?? false;
  // Kept here, not in the form: saving refreshes the order, nothing is left to send, and the form goes away while the result is still showing.
  const [done, setDone] = useState<Result | null>(null);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      {purchase.isPending ? <SkeletonRows count={3} /> : null}
      {purchase.isError ? <ErrorState message={t('Could not load this order.')} onRetry={() => void purchase.refetch()} /> : null}
      {done ? <Done done={done} /> : null}
      {!done && p && !allowed ? <Notice>You do not have permission to do that.</Notice> : null}
      {!done && p && allowed && !canSendBack(p, me?.permissions) ? <Notice kind="info">Nothing is left to return from this order.</Notice> : null}
      {!done && p && allowed && canSendBack(p, me?.permissions) ? <Form p={p} onDone={setDone} /> : null}
    </ScrollView>
  );
}

function Form({ p, onDone }: { p: Purchase; onDone: (r: Result) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Set when an attempt lost its connection: what was asked and what the order showed before, so a retry can first see if it went through.
  const unsure = useRef<{ before: Record<string, string>; chosen: Record<string, string> } | null>(null);
  const lines = chosenLines(chosen);
  const credit = lines.length ? estimateCredit(p, chosen) : null;

  const refresh = () => {
    for (const k of ['purchases', 'suppliers', 'stock', 'home']) void queryClient.invalidateQueries({ queryKey: [k] });
  };
  const send = useMutation({
    mutationFn: () => sendGoodsBack(p.id, returnBody({ chosen, reason, today: localDateISO() })),
    onSuccess: (r) => {
      haptics.success();
      unsure.current = null;
      onDone({ reference: r.reference_no, credit: r.grand_total });
      refresh();
    },
    onError: (e) => {
      haptics.warning();
      if (e instanceof ApiError && (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT')) unsure.current = { before: Object.fromEntries(p.items.map((i) => [i.id, i.returned_quantity])), chosen };
      else refresh(); // a refusal usually means the order changed under us: show the real amounts again
    },
  });

  async function confirm() {
    setProblem(null);
    if (unsure.current) {
      // The last attempt may have been saved before the connection dropped, and this server call is not safe to repeat: look first.
      setChecking(true);
      try {
        const fresh = await getPurchase(p.id);
        if (alreadySent(unsure.current.before, fresh.items, unsure.current.chosen)) {
          unsure.current = null;
          haptics.success();
          onDone({ reference: null, credit: null });
          refresh();
          return;
        }
      } catch {
        setProblem(t('Could not check the order. Check your connection and try again.'));
        return;
      } finally {
        setChecking(false);
      }
    }
    Alert.alert(t('Return these goods to the supplier?'), t('Stock goes down and the supplier gives you about {amount} credit.', { amount: formatBDT(credit ?? '0') }), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, return them'), onPress: () => send.mutate() }]);
  }

  function change(itemId: string, q: string) {
    send.reset();
    setProblem(null);
    setChosen((c) => ({ ...c, [itemId]: q }));
  }

  return (
    <>
      <View style={{ gap: Spacing.one }}>
        <ThemedText type="heading">What goes back to the supplier?</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" literal>
          {p.supplier_name} · {p.reference_no}
        </ThemedText>
      </View>

      <View style={{ borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, paddingHorizontal: Spacing.three }}>
        {p.items.map((it, i) => {
          const left = sendable(it);
          const q = chosen[it.id] ?? '0';
          const none = Number(left) <= 0;
          const name = itemName(it.product_name, it.variant_name);
          return (
            <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border, opacity: none ? 0.5 : 1 }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallMedium" numberOfLines={2} literal>
                  {name}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {none ? (Number(it.received_quantity) > 0 ? t('All returned already') : t('Not arrived yet')) : t('Up to {n} can be returned', { n: Number(left) })}
                </ThemedText>
              </View>
              {none ? null : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Step icon="Minus" label={t('Fewer {name}', { name })} disabled={Number(q) <= 0} onPress={() => change(it.id, stepQuantity(q, -1, left, it.unit_allow_decimal))} />
                  <View style={{ minWidth: 44, alignItems: 'center' }}>
                    <ThemedText type="bodyMedium" style={{ color: Number(q) > 0 ? theme.brandText : theme.textMuted }}>
                      {Number(q)}
                    </ThemedText>
                  </View>
                  <Step icon="Plus" label={t('More {name}', { name })} disabled={Number(q) >= Number(left)} onPress={() => change(it.id, stepQuantity(q, 1, left, it.unit_allow_decimal))} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Field label="Why are the goods being returned? (optional)" value={reason} onChangeText={setReason} placeholder="For example: damaged, wrong item" />

      {lines.length === 0 ? <Notice kind="info">Choose how many of each item to return.</Notice> : null}
      {credit ? (
        <View style={{ gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
            <ThemedText type="bodyMedium" style={{ flex: 1 }}>
              Credit from the supplier, about
            </ThemedText>
            <ThemedText type="bodyMedium" style={{ color: theme.success }}>
              {formatBDT(credit)}
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textMuted">
            The exact amount is worked out when you confirm: at the price the goods came in at.
          </ThemedText>
        </View>
      ) : null}

      {problem ? <Notice>{problem}</Notice> : null}
      {send.isError ? <Notice>{describeSendBackError(send.error)}</Notice> : null}

      <Button title="Return the goods" variant="success" size="lg" loading={send.isPending || checking} disabled={lines.length === 0} onPress={() => void confirm()} />
    </>
  );
}

function Done({ done }: { done: Result }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  return (
    <View style={{ alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Check" size={40} color={theme.onBrand} />
      </View>
      <ThemedText type="heading">Goods returned to the supplier</ThemedText>
      {done.credit ? <ThemedText type="title">{formatBDT(done.credit)}</ThemedText> : null}
      {done.credit ? (
        <ThemedText type="small" themeColor="textSecondary">
          Credit from the supplier
        </ThemedText>
      ) : null}
      {done.reference ? (
        <ThemedText type="caption" themeColor="textMuted" literal>
          {t('Return {n}', { n: done.reference })}
        </ThemedText>
      ) : (
        <ThemedText type="caption" themeColor="textMuted">
          It was saved before the connection dropped. See it on the order.
        </ThemedText>
      )}
      <Button title="Done" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: Spacing.two }} />
    </View>
  );
}
