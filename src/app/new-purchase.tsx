import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
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
import { Radius, Spacing } from '@/constants/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/customers/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { dayChoice, type DayChoice } from '@/money/logic';
import { confirmPurchase, createPurchase, payPurchase, receivePurchase } from '@/purchases/api';
import { ItemFinder } from '@/purchases/item-finder';
import { addLine, describePurchaseError, estimate, isCost, isQty, paymentProblem, problems, purchaseBody, type Line } from '@/purchases/logic';
import { findWarehouseId } from '@/sell/api';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { listSuppliers, type SupplierRow } from '@/suppliers/api';
import { showToast } from '@/ui/toast';

type Stage = 'none' | 'created' | 'confirmed' | 'received' | 'paid';

/**
 * Write down goods bought from a supplier: who, what, how many and at what price. It can stay a draft, or be placed (the supplier
 * is owed), marked as arrived (stock goes up) and paid, in one go. If a later step fails, the order that exists is kept and
 * the button tries only what is left, so nothing is written twice.
 */
export default function NewPurchaseScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const perms = me?.permissions;

  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [vat, setVat] = useState('');
  const [invoice, setInvoice] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState<DayChoice>('today');
  const [arrived, setArrived] = useState(true);
  const [paidNow, setPaidNow] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [choosing, setChoosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What has already been done, kept across a failed try so a retry never repeats a step.
  const stage = useRef<Stage>('none');
  // The screen only needs to know whether an order exists yet (what can still be changed); the steps themselves live in the ref.
  const [created, setCreated] = useState(false);
  const made = useRef<string | null>(null);
  const keys = useRef({ create: newIdempotencyKey(), pay: newIdempotencyKey() });

  const warehouse = useQuery({ queryKey: ['warehouse', branchId], queryFn: () => findWarehouseId(branchId), enabled: !!branchId, staleTime: 10 * 60_000 });
  const canPlace = perms?.includes('purchase.confirm') ?? false;
  const canReceive = perms?.includes('purchase.receive') ?? false;
  const canPay = perms?.includes('purchase.payment') ?? false;
  const est = estimate(lines, vat);
  const problem = problems({ supplierId: supplier?.id ?? null, lines });
  const payProblem = paidNow.trim() ? paymentProblem(paidNow, est.total) : null;

  async function run(upTo: 'draft' | 'full') {
    setError(null);
    try {
      if (stage.current === 'none') {
        const body = purchaseBody({ supplierId: supplier!.id, branchId, warehouseId: warehouse.data!, date: dayChoice(day), invoiceNo: invoice, note, vatPct: vat, lines });
        made.current = (await createPurchase(body, keys.current.create)).id;
        stage.current = 'created';
        setCreated(true);
      }
      if (upTo === 'full') {
        if (stage.current === 'created') {
          await confirmPurchase(made.current!);
          stage.current = 'confirmed';
        }
        if (arrived && canReceive && stage.current === 'confirmed') {
          await receivePurchase(made.current!);
          stage.current = 'received';
        }
        if (paidNow.trim() && canPay && stage.current !== 'paid') {
          await payPurchase(made.current!, { amount: paidNow.trim(), payment_method: method, payment_date: dayChoice('today'), note: '' }, keys.current.pay);
          stage.current = 'paid';
        }
      }
      haptics.success();
      showToast({ text: upTo === 'draft' ? t('Saved as a draft') : t('Purchase saved') });
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['stock'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
      router.replace({ pathname: '/purchase/[id]', params: { id: made.current! } });
    } catch (e) {
      haptics.warning();
      const after = made.current ? ` ${t('The order was saved. Tap again to finish the rest, or open it from Purchases.')}` : '';
      setError(`${t(describePurchaseError(e))}${after}`);
    }
  }
  const go = useMutation({ mutationFn: run });
  const edited = () => {
    // Changing what is typed after nothing was written is a new attempt; after the order exists it stays the same order.
    if (stage.current === 'none') keys.current = { create: newIdempotencyKey(), pay: newIdempotencyKey() };
  };

  const setLine = (i: number, patch: Partial<Line>) => {
    edited();
    setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  };
  const busy = go.isPending;
  const ready = !problem && !!warehouse.data && !payProblem;

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
            <Tap accessibilityRole="button" onPress={() => setChoosing(true)} disabled={created} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1.5, borderColor: supplier ? theme.border : theme.brand, backgroundColor: theme.card }}>
              <Icon name="Package" size={22} color={theme.brand} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" themeColor="textMuted">
                  Supplier
                </ThemedText>
                <ThemedText type="bodyMedium" numberOfLines={1} literal>
                  {supplier ? supplier.name : t('Choose the supplier')}
                </ThemedText>
              </View>
              <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                {supplier ? 'Change' : 'Choose'}
              </ThemedText>
            </Tap>

            <View style={{ gap: Spacing.two }}>
              <ThemedText type="smallMedium">What did you buy?</ThemedText>
              {lines.map((l, i) => (
                <View key={l.variantId} style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallMedium" numberOfLines={2} literal>
                        {l.name}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textMuted" literal>
                        {l.sku}
                      </ThemedText>
                    </View>
                    <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: l.name })} disabled={created} onPress={() => { edited(); setLines((ls) => ls.filter((_, k) => k !== i)); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="Trash2" size={20} color={theme.danger} />
                    </Tap>
                  </View>
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <View style={{ flex: 1 }}>
                      <Field label="How many" value={l.quantity} onChangeText={(v) => setLine(i, { quantity: v })} keyboardType={l.allowDecimal ? 'decimal-pad' : 'number-pad'} error={l.quantity && !isQty(l.quantity, l.allowDecimal) ? 'Use a whole number.' : undefined} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Price of one" prefix="৳" value={l.unitCost} onChangeText={(v) => setLine(i, { unitCost: v })} keyboardType="decimal-pad" placeholder="0" error={l.unitCost && !isCost(l.unitCost) ? 'Use numbers only.' : undefined} />
                    </View>
                  </View>
                </View>
              ))}
              <Button title={lines.length ? 'Add another item' : 'Add an item'} variant="secondary" disabled={created} onPress={() => setAdding(true)} trailing={<Icon name="Plus" size={20} color={theme.textSecondary} />} />
            </View>

            <View style={{ gap: Spacing.two }}>
              <ThemedText type="smallMedium">Which day?</ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {(['today', 'yesterday'] as const).map((d) => {
                  const on = day === d;
                  return (
                    <Tap key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { edited(); setDay(d); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border, backgroundColor: on ? theme.brandSoft : theme.card }}>
                      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                        {d === 'today' ? 'Today' : 'Yesterday'}
                      </ThemedText>
                    </Tap>
                  );
                })}
              </View>
            </View>

            <Field label="Supplier's bill number (optional)" value={invoice} onChangeText={(v) => { edited(); setInvoice(v); }} autoCapitalize="characters" />
            <Field label="VAT on the bill, in percent (optional)" value={vat} onChangeText={(v) => { edited(); setVat(v); }} keyboardType="decimal-pad" placeholder="For example 15" hint="Added on top of the prices above." />
            <Field label="Note (optional)" value={note} onChangeText={(v) => { edited(); setNote(v); }} />

            {lines.length > 0 ? (
              <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                <Sum label="Items" value={formatBDT(est.subtotal)} />
                {est.tax !== '0' ? <Sum label="VAT" value={formatBDT(est.tax)} /> : null}
                <Sum label="Total (the supplier will confirm)" value={formatBDT(est.total)} strong />
              </View>
            ) : null}

            {canReceive && canPlace ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="bodyMedium">The goods have arrived</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    They go into your stock now.
                  </ThemedText>
                </View>
                <Switch value={arrived} onValueChange={setArrived} trackColor={{ true: theme.brand }} />
              </View>
            ) : null}
            {canPay && canPlace ? (
              <View style={{ gap: Spacing.two }}>
                <Field label="Paid now (optional)" prefix="৳" value={paidNow} onChangeText={setPaidNow} keyboardType="decimal-pad" placeholder="0" error={payProblem ?? undefined} hint="Leave empty to pay later. It stays as money you owe." />
                {paidNow.trim() ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                    {PAYMENT_METHODS.map((m) => {
                      const on = method === m.key;
                      return (
                        <Tap key={m.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setMethod(m.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
                          <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                            {m.label}
                          </ThemedText>
                        </Tap>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            {warehouse.isError ? <ErrorState message={t('Could not find the store room for this branch.')} onRetry={() => void warehouse.refetch()} /> : null}
            {problem && (lines.length > 0 || supplier) ? <Notice kind="info">{problem}</Notice> : null}
            {error ? <Notice>{error}</Notice> : null}

            {canPlace ? <Button title={created ? 'Finish the purchase' : 'Save the purchase'} variant="success" size="lg" loading={busy} disabled={!ready} onPress={() => go.mutate('full')} /> : null}
            <Button title="Save as a draft" variant="secondary" disabled={!ready || busy || created} onPress={() => go.mutate('draft')} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SupplierSheet visible={choosing} onClose={() => setChoosing(false)} onPick={(s) => { edited(); setSupplier(s); setChoosing(false); }} />
      <ItemFinder
        visible={adding}
        onClose={() => setAdding(false)}
        branchId={branchId}
        canScan={usesBarcodes}
        countOf={(v) => (lines.some((l) => l.variantId === v) ? 1 : 0)}
        onPick={(it) => { edited(); setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); }}
        onCode={(it) => { edited(); setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); showToast({ text: t('Added: {name}', { name: it.name }) }); }}
      />
    </View>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
        {label}
      </ThemedText>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} literal>
        {value}
      </ThemedText>
    </View>
  );
}

function SupplierSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (s: SupplierRow) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [search, setSearch] = useState('');
  const list = useInfiniteQuery({
    queryKey: ['suppliers', 'pick', search.trim()],
    queryFn: ({ pageParam }) => listSuppliers({ search, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: visible,
  });
  const rows = (list.data?.pages.flatMap((p) => p.rows) ?? []).filter((r) => r.is_active);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Choose the supplier">
      <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.three }}>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, code or phone" autoCapitalize="none" autoCorrect={false} />
        {list.isPending ? <SkeletonRows count={3} /> : null}
        {list.isError ? <ErrorState message={t('Could not load suppliers.')} onRetry={() => void list.refetch()} /> : null}
        {list.isSuccess && rows.length === 0 ? <Notice kind="info">Nobody matches that. Add the supplier first from the Suppliers page.</Notice> : null}
        {rows.map((r) => (
          <Tap key={r.id} accessibilityRole="button" onPress={() => onPick(r)} style={{ minHeight: 56, justifyContent: 'center', padding: Spacing.two, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }}>
            <ThemedText type="smallMedium" numberOfLines={1} literal>
              {r.name}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" literal>
              {r.code}
              {r.phone ? ` · ${r.phone}` : ''}
            </ThemedText>
          </Tap>
        ))}
        {list.hasNextPage ? <Button title="Show more" variant="secondary" loading={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} /> : null}
      </View>
    </BottomSheet>
  );
}
