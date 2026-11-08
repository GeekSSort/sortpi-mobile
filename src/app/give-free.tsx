import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
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
import { Spacing } from '@/constants/theme';
import { giveFree } from '@/extras/api';
import { LineCard } from '@/extras/line-card';
import { giveProblem } from '@/extras/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { ItemFinder } from '@/purchases/item-finder';
import { addLine, type Line } from '@/purchases/logic';
import { findWarehouseId } from '@/sell/api';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';

/** Give goods away for nothing: they come off the shelf now. Needs `inventory.adjust`. */
export default function GiveFreeScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const [lines, setLines] = useState<Line[]>([]);
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const warehouse = useQuery({ queryKey: ['warehouse', branchId], queryFn: () => findWarehouseId(branchId), enabled: !!branchId, staleTime: 10 * 60_000 });
  const problem = giveProblem(lines);
  const touch = () => (key.current = newIdempotencyKey());
  const save = useMutation({
    mutationFn: () => giveFree({ warehouse: warehouse.data as string, recipient: recipient.trim(), note: note.trim(), items: lines.map((l) => ({ variant: l.variantId, quantity: l.quantity.trim() })) }, key.current),
    onSuccess: () => {
      haptics.success();
      void qc.invalidateQueries({ queryKey: ['free-issues'] });
      void qc.invalidateQueries({ queryKey: ['stock'] });
      showToast({ text: t('Recorded. The stock is down.') });
      router.back();
    },
    onError: (e) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Give goods free') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
            <Field label="Who is it for?" value={recipient} onChangeText={(v) => { touch(); setRecipient(v); }} autoCapitalize="words" placeholder="A customer, a sample table…" />
            {lines.map((l, i) => (
              <LineCard key={l.variantId} name={l.name} sku={l.sku} quantity={l.quantity} allowDecimal={l.allowDecimal} onQuantity={(v) => { touch(); setLines((ls) => ls.map((x, k) => (k === i ? { ...x, quantity: v } : x))); }} onRemove={() => { touch(); setLines((ls) => ls.filter((_, k) => k !== i)); }} />
            ))}
            <Button title={lines.length ? 'Add another item' : 'Add an item'} variant="secondary" onPress={() => setAdding(true)} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />
            <Field label="Note (optional)" value={note} onChangeText={(v) => { touch(); setNote(v); }} />
            {problem && lines.length > 0 ? <Notice kind="info">{problem}</Notice> : null}
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title="Give them free" variant="success" size="lg" loading={save.isPending} disabled={!!problem || !warehouse.data} onPress={() => { setFailure(null); save.mutate(); }} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ItemFinder
        visible={adding}
        onClose={() => setAdding(false)}
        branchId={branchId}
        canScan={usesBarcodes}
        countOf={(v) => (lines.some((l) => l.variantId === v) ? 1 : 0)}
        onPick={(it) => { touch(); setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); setAdding(false); }}
        onCode={(it) => { touch(); setLines((ls) => addLine(ls, { variantId: it.variantId, name: it.name, sku: it.sku, unitShort: it.unitShort, allowDecimal: it.allowDecimal })); haptics.tap(); }}
      />
    </View>
  );
}
