import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { getPurchase, updatePurchase, type Purchase } from '@/purchases/api';
import { canEditPurchase, editBody, lineFromItem } from '@/purchases/edit';
import { ItemFinder } from '@/purchases/item-finder';
import { addLine, describePurchaseError, isCost, isQty, problems, type Line } from '@/purchases/logic';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';

/** Change a draft purchase, or a placed one nothing has arrived on: the items, how many, the price, the bill number and the note. */
export default function EditPurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const one = useQuery({ queryKey: ['purchases', 'one', id], queryFn: () => getPurchase(id), enabled: !!id });
  if (!one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <EditForm purchase={one.data} />;
}

function EditForm({ purchase }: { purchase: Purchase }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const [lines, setLines] = useState<Line[]>(purchase.items.map(lineFromItem));
  const [invoice, setInvoice] = useState(purchase.supplier_invoice_no ?? '');
  const [note, setNote] = useState(purchase.note ?? '');
  const [adding, setAdding] = useState(false);
  const allowed = canEditPurchase(purchase, me?.permissions);
  const problem = problems({ supplierId: purchase.supplier, lines });
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () => updatePurchase(purchase.id, editBody({ lines, before: purchase.items, invoiceNo: invoice, note })),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Purchase saved') });
      void qc.invalidateQueries({ queryKey: ['purchases'] });
      void qc.invalidateQueries({ queryKey: ['suppliers'] });
      router.back();
    },
    onError: () => haptics.warning(),
  });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>This purchase cannot be changed any more.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Change purchase') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
            <ThemedText type="bodyMedium" literal>
              {`${purchase.reference_no} · ${purchase.supplier_name}`}
            </ThemedText>
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
            <Button title="Add an item" variant="secondary" onPress={() => setAdding(true)} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />
            <Field label="Supplier's bill number (optional)" value={invoice} onChangeText={setInvoice} autoCapitalize="characters" />
            <Field label="Note (optional)" value={note} onChangeText={setNote} />
            <ThemedText type="caption" themeColor="textMuted">
              {`${t('Before')}: ${formatBDT(purchase.grand_total)} — ${t('the shop works out the new total when you save.')}`}
            </ThemedText>
            {problem ? <Notice kind="info">{problem}</Notice> : null}
            {save.isError ? <Notice>{describePurchaseError(save.error as ApiError)}</Notice> : null}
            <Button title="Save changes" variant="success" size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()} />
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
}
