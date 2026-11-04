import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Step } from '@/components/quantity-step';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { ItemFinder } from '@/purchases/item-finder';
import { stepQuantity } from '@/sales/returns';
import { CustomerPicker } from '@/sell/customer-picker';
import type { PickedCustomer } from '@/sell/customers';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';

import { createOrder, createQuote, previewQuote } from './api';
import { addDocLine, dateAhead, describeOrderError, docProblem, DUE_CHOICES, orderBody, quoteBody, VALID_CHOICES, type DateChoice, type DocLine } from './logic';

/**
 * Write down an order or a quotation: who, what and how many, and the day. The server works out every price and tax, so nothing here
 * adds money up: the figure shown is the server's own estimate for these items.
 */
export function DocForm({ mode }: { mode: 'order' | 'quote' }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const branchId = me?.active_branch?.id;
  const canScan = useUsesBarcodes();
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [choice, setChoice] = useState<DateChoice>(mode === 'order' ? 'three' : 'week');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<DocLine[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const order = mode === 'order';
  const who = !!customer || (!order && name.trim().length > 0);
  const problem = docProblem({ who, lines });
  const sig = lines.map((l) => `${l.variantId}:${l.quantity}`).join(',');

  const estimate = useQuery({
    queryKey: ['doc-preview', sig],
    queryFn: () => previewQuote({ customer_name: 'estimate', items: lines.map((l) => ({ variant_id: l.variantId, quantity: Number(l.quantity).toFixed(3) })) } as never),
    enabled: lines.length > 0 && !docProblem({ who: true, lines }),
    staleTime: 30_000,
    retry: false,
  });

  const save = useMutation({
    mutationFn: async () => {
      const date = dateAhead(choice);
      if (order) return { kind: 'order' as const, doc: await createOrder(orderBody({ customerId: customer!.id, dueDate: date, note, branchId, lines })) };
      return { kind: 'quote' as const, doc: await createQuote(quoteBody({ customer: customer ? { id: customer.id } : { name, phone }, validUntil: date, note, branchId, lines })) };
    },
    onSuccess: (r) => {
      haptics.success();
      showToast({ text: order ? t('Order saved') : t('Quotation saved') });
      void queryClient.invalidateQueries({ queryKey: [order ? 'orders' : 'quotes'] });
      router.replace(r.kind === 'order' ? { pathname: '/order/[id]', params: { id: r.doc.id } } : { pathname: '/quotation/[id]', params: { id: r.doc.id } });
    },
    onError: () => haptics.warning(),
  });
  const setQty = (i: number, dir: 1 | -1) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, quantity: stepQuantity(l.quantity, dir, '999999', l.allowDecimal) } : l)));
  const choices = order ? DUE_CHOICES : VALID_CHOICES;
  const card = { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous' as const, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.canvas }} behavior="padding">
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
        <Tap accessibilityRole="button" onPress={() => setChoosing(true)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1.5, borderColor: customer ? theme.border : theme.brand, backgroundColor: theme.card }}>
          <Icon name="Users" size={22} color={theme.brandText} />
          <View style={{ flex: 1 }}>
            <ThemedText type="bodyMedium" literal={!!customer}>
              {customer ? customer.name : order ? 'Choose the customer' : 'Choose a customer, or write a name below'}
            </ThemedText>
            {customer ? (
              <ThemedText type="caption" themeColor="textMuted" literal>
                {customer.phone}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
            {customer ? 'Change' : 'Choose'}
          </ThemedText>
        </Tap>
        {!order && !customer ? (
          <View style={{ gap: Spacing.two }}>
            <Field label="Customer name" value={name} onChangeText={setName} placeholder="For someone not on your list" />
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" />
          </View>
        ) : null}

        <View style={card}>
          <ThemedText type="bodyMedium">{order ? 'When will it be collected?' : 'How long is this price good for?'}</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {choices.map((c) => {
              const on = choice === c.id;
              return (
                <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setChoice(c.id)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border }}>
                  <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                    {c.label}
                  </ThemedText>
                </Tap>
              );
            })}
          </View>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {dateAhead(choice).split('-').reverse().join('/')}
          </ThemedText>
        </View>

        <View style={card}>
          <ThemedText type="bodyMedium">Items</ThemedText>
          {lines.length === 0 ? <ThemedText type="small" themeColor="textMuted">Add what the customer wants.</ThemedText> : null}
          {lines.map((l, i) => (
            <View key={l.variantId} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallMedium" numberOfLines={2} literal>
                  {l.name}
                </ThemedText>
                <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: l.name })} onPress={() => setLines((ls) => ls.filter((_, k) => k !== i))} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <ThemedText type="caption" style={{ color: theme.danger }}>
                    Remove
                  </ThemedText>
                </Tap>
              </View>
              <Step icon="Minus" label={t('Fewer {name}', { name: l.name })} disabled={Number(l.quantity) <= 1 && !l.allowDecimal} onPress={() => setQty(i, -1)} />
              <ThemedText type="bodyMedium" style={{ minWidth: 40, textAlign: 'center' }} literal>
                {String(Number(l.quantity))}
              </ThemedText>
              <Step icon="Plus" label={t('More {name}', { name: l.name })} disabled={false} onPress={() => setQty(i, 1)} />
            </View>
          ))}
          <Button title="Add an item" variant="secondary" onPress={() => setAdding(true)} />
        </View>

        {estimate.data ? (
          <View style={{ ...card, backgroundColor: theme.successSoft, borderColor: theme.successBorder, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name="Cash" size={22} color={theme.success} />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" themeColor="textSecondary">
                The price, worked out by your shop
              </ThemedText>
              <ThemedText type="title" style={{ color: theme.success }} literal>
                {formatBDT(estimate.data.grand_total)}
              </ThemedText>
            </View>
          </View>
        ) : null}

        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder={order ? 'For example: write “Happy Birthday” on it' : 'Anything the customer should know'} />
        {problem && (lines.length > 0 || who) ? <Notice kind="info">{problem}</Notice> : null}
        {save.isError ? <Notice>{describeOrderError(save.error)}</Notice> : null}
        <Button title={order ? 'Save the order' : 'Save the quotation'} variant="success" size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()} />
      </KeyboardAwareScrollView>

      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title="Choose the customer">
        <CustomerPicker allowWalkIn={false} onPick={(c) => setCustomer(c)} onClose={() => setChoosing(false)} />
      </BottomSheet>
      {branchId ? (
        <ItemFinder
          visible={adding}
          onClose={() => setAdding(false)}
          branchId={branchId}
          canScan={canScan}
          countOf={(v) => (lines.some((l) => l.variantId === v) ? 1 : 0)}
          onPick={(it) => { setLines((ls) => addDocLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); }}
          onCode={(it) => { setLines((ls) => addDocLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); showToast({ text: t('Added: {name}', { name: it.name }) }); }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
