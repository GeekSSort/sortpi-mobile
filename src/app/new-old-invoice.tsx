import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { localDateISO } from '@/lib/dates';
import { recordOldInvoice } from '@/purchases/api';
import { ItemFinder } from '@/purchases/item-finder';
import { addLine, describePurchaseError, isCost, isQty, type Line } from '@/purchases/logic';
import { oldBody, validateOld } from '@/purchases/old';
import { findWarehouseId } from '@/sell/api';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { listSuppliers } from '@/suppliers/api';
import { showToast } from '@/ui/toast';

/** Write down a supplier's bill from before the shop used SortPi. Its stock and book entries are posted today, at the bill's cost. Needs `purchase.create`. */
export default function NewOldInvoiceScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const today = localDateISO(new Date());
  const [supplier, setSupplier] = useState<{ id: string; name: string } | null>(null);
  const [billDate, setBillDate] = useState(today);
  const [billNo, setBillNo] = useState('');
  const [note, setNote] = useState('');
  const [addsStock, setAddsStock] = useState(true);
  const [settledBefore, setSettledBefore] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<{ supplierId?: string; billDate?: string; lines?: string }>({});
  const key = useRef(newIdempotencyKey());
  const warehouse = useQuery({ queryKey: ['warehouse', branchId], queryFn: () => findWarehouseId(branchId), enabled: !!branchId, staleTime: 10 * 60_000 });
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () => recordOldInvoice(oldBody({ supplierId: supplier!.id, billDate, billNo, note, addsStock, settledBefore, lines }, { branchId, warehouseId: warehouse.data as string }), key.current),
    onSuccess: () => {
      haptics.success();
      void qc.invalidateQueries({ queryKey: ['purchases'] });
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      void qc.invalidateQueries({ queryKey: ['stock'] });
      showToast({ text: t('Old invoice saved.') });
      router.back();
    },
    onError: () => haptics.warning(),
  });
  function submit() {
    const e = validateOld({ supplierId: supplier?.id ?? '', billDate, billNo, note, addsStock, settledBefore, lines }, today);
    setErrors(e);
    if (!Object.keys(e).length && warehouse.data) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Old Invoice') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Picker label="Supplier" required value={supplier} onChange={(s) => { setSupplier(s); key.current = newIdempotencyKey(); }} load={async (s) => (await listSuppliers({ search: s ?? '', page: 1 })).rows.map((r) => ({ id: r.id, name: r.name }))} queryKey="old-invoice-suppliers" error={errors.supplierId} />
              <Field label="Date on the bill" required value={billDate} onChangeText={setBillDate} placeholder="2026-10-01" keyboardType="numbers-and-punctuation" error={errors.billDate} />
              <Field label="Supplier's bill number (optional)" value={billNo} onChangeText={setBillNo} autoCapitalize="characters" />
            </View>

            {lines.map((l, i) => (
              <View key={l.variantId} style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                  <ThemedText type="smallMedium" style={{ flex: 1 }} numberOfLines={2} literal>
                    {l.name}
                  </ThemedText>
                  <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: l.name })} onPress={() => setLines((ls) => ls.filter((_, k) => k !== i))} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="Trash2" size={20} color={theme.danger} />
                  </Tap>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <View style={{ flex: 1 }}>
                    <Field label="How many" value={l.quantity} onChangeText={(v) => setLine(i, { quantity: v })} keyboardType={l.allowDecimal ? 'decimal-pad' : 'number-pad'} error={l.quantity && !isQty(l.quantity, l.allowDecimal) ? t('Enter an amount above zero.') : undefined} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Price of one" prefix="৳" value={l.unitCost} onChangeText={(v) => setLine(i, { unitCost: v })} keyboardType="decimal-pad" error={l.unitCost && !isCost(l.unitCost) ? t('Enter a price above zero.') : undefined} />
                  </View>
                </View>
              </View>
            ))}
            {errors.lines ? <Notice kind="info">{errors.lines}</Notice> : null}
            <Button title={lines.length ? 'Add another item' : 'Add an item'} variant="secondary" onPress={() => setAdding(true)} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />

            <Choice title="Put these goods on my shelf" hint="They go into your stock now, at the bill's price." value={addsStock} onChange={setAddsStock} />
            <Choice title="Already paid before SortPi" hint="Off means you still owe the supplier this bill." value={settledBefore} onChange={setSettledBefore} />
            <Field label="Note (optional)" value={note} onChangeText={setNote} />

            {save.isError ? <Notice>{describePurchaseError(save.error as never)}</Notice> : null}
            <Button title="Save the old invoice" variant="success" size="lg" loading={save.isPending} disabled={!warehouse.data} onPress={submit} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ItemFinder
        visible={adding}
        onClose={() => setAdding(false)}
        branchId={branchId}
        canScan={usesBarcodes}
        countOf={(v) => (lines.some((l) => l.variantId === v) ? 1 : 0)}
        onPick={(it) => { setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); setAdding(false); }}
        onCode={(it) => { setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); }}
      />
    </View>
  );

  function Choice({ title, hint, value, onChange }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="bodyMedium">{title}</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {hint}
          </ThemedText>
        </View>
        <Switch value={value} onValueChange={(v) => { onChange(v); key.current = newIdempotencyKey(); }} trackColor={{ true: theme.brand }} />
      </View>
    );
  }
}
