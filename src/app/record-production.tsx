import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { recordProduction } from '@/extras/api';
import { LineCard } from '@/extras/line-card';
import { productionBody, productionProblem } from '@/extras/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { localDateISO } from '@/lib/dates';
import { ItemFinder } from '@/purchases/item-finder';
import { addLine, type Line } from '@/purchases/logic';
import { findWarehouseId } from '@/sell/api';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';

type Side = 'made' | 'used' | null;

/** Record a production run (what was made, what it used) or make up a combo pack (`?combo=1`): the contents come off the shelf, the pack goes on. Needs `inventory.adjust`. */
export default function RecordProductionScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { combo } = useLocalSearchParams<{ combo?: string }>();
  const isCombo = combo === '1';
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const [made, setMade] = useState<Line[]>([]);
  const [used, setUsed] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [side, setSide] = useState<Side>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const touch = () => (key.current = newIdempotencyKey());
  const warehouse = useQuery({ queryKey: ['warehouse', branchId], queryFn: () => findWarehouseId(branchId), enabled: !!branchId, staleTime: 10 * 60_000 });
  const asLines = (ls: Line[]) => ls.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitCost: l.unitCost }));
  const problem = productionProblem({ made: asLines(made), used: asLines(used), combo: isCombo });

  const save = useMutation({
    mutationFn: () => recordProduction(productionBody({ warehouseId: warehouse.data as string, date: localDateISO(new Date()), note, combo: isCombo, made: asLines(made), used: asLines(used) }), key.current),
    onSuccess: () => {
      haptics.success();
      void qc.invalidateQueries({ queryKey: ['production'] });
      void qc.invalidateQueries({ queryKey: ['stock'] });
      showToast({ text: t(isCombo ? 'Pack made up.' : 'Recorded.') });
      router.back();
    },
    onError: (e) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.'),
  });
  const pickInto = (it: { variantId: string; name: string; sku: string; unitShort: string | null; allowDecimal: boolean }) => {
    touch();
    const base = { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal };
    if (side === 'made') setMade((ls) => (isCombo ? [{ ...base, quantity: '1', unitCost: '' }] : addLine(ls, base)));
    else setUsed((ls) => addLine(ls, base));
    haptics.tap();
  };
  const card = (ls: Line[], set: (f: (l: Line[]) => Line[]) => void, withCost: boolean) =>
    ls.map((l, i) => (
      <LineCard key={l.variantId} name={l.name} sku={l.sku} quantity={l.quantity} allowDecimal={l.allowDecimal} quantityLabel={withCost || !isCombo ? 'How many' : 'In each pack'} unitCost={l.unitCost} onUnitCost={withCost ? (v) => { touch(); set((x) => x.map((y, k) => (k === i ? { ...y, unitCost: v } : y))); } : undefined} onQuantity={(v) => { touch(); set((x) => x.map((y, k) => (k === i ? { ...y, quantity: v } : y))); }} onRemove={() => { touch(); set((x) => x.filter((_, k) => k !== i)); }} />
    ));

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t(isCombo ? 'Make up a combo pack' : 'Record production') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
            <ThemedText type="bodyMedium">{isCombo ? 'The pack' : 'What was made'}</ThemedText>
            {card(made, setMade, !isCombo && used.length === 0)}
            {isCombo && made.length > 0 ? null : <Button title={isCombo ? 'Choose the pack' : 'Add what was made'} variant="secondary" onPress={() => setSide('made')} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />}
            <ThemedText type="bodyMedium">{isCombo ? 'In each pack' : 'What it used (optional)'}</ThemedText>
            {card(used, setUsed, false)}
            <Button title="Add an item it used" variant="secondary" onPress={() => setSide('used')} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />
            <Field label="Note (optional)" value={note} onChangeText={(v) => { touch(); setNote(v); }} />
            {problem && (made.length > 0 || used.length > 0) ? <Notice kind="info">{problem}</Notice> : null}
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={isCombo ? 'Make up the pack' : 'Save'} variant="success" size="lg" loading={save.isPending} disabled={!!problem || !warehouse.data} onPress={() => { setFailure(null); save.mutate(); }} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ItemFinder visible={side !== null} onClose={() => setSide(null)} branchId={branchId} canScan={usesBarcodes} countOf={(v) => ([...made, ...used].some((l) => l.variantId === v) ? 1 : 0)} onPick={(it) => { pickInto(it); setSide(null); }} onCode={pickInto} />
    </View>
  );
}
