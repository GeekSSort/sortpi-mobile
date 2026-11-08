import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createTransfer, listAccounts } from '@/accounts/api';
import { transferable, validateTransfer } from '@/accounts/logic';
import { newIdempotencyKey } from '@/api/idempotency';
import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { dayChoice, type DayChoice } from '@/money/logic';
import { showToast } from '@/ui/toast';

type Pick = { id: string; name: string };

/** Move money between two of your accounts, like cash to bank. Needs `finance.manage_accounts`. Receivable, Payable, Inventory and the like are left out: another ledger answers for them. */
export default function AddTransferScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [from, setFrom] = useState<Pick | null>(null);
  const [to, setTo] = useState<Pick | null>(null);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState<DayChoice>('today');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ from?: string; to?: string; amount?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey()); // one per open form: a retry after a dropped connection cannot move the money twice

  const load = async (s?: string): Promise<Pick[]> => transferable(await listAccounts()).filter((a) => !s || `${a.name} ${a.code}`.toLowerCase().includes(s.toLowerCase())).map((a) => ({ id: a.id, name: `${a.name} (${a.code})` }));
  const save = useMutation({
    mutationFn: () => createTransfer({ from_account: from!.id, to_account: to!.id, amount: amount.trim(), date: dayChoice(day), description: note.trim() }, key.current),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['transfers'] });
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      showToast({ text: t('Money moved.') });
      router.back();
    },
    onError: (e) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not move the money. Try again.'),
  });

  function submit() {
    const e = validateTransfer({ from: from?.id ?? '', to: to?.id ?? '', amount, date: dayChoice(day) });
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Move money') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Picker label="From" required value={from} onChange={(v) => { setFrom(v); key.current = newIdempotencyKey(); }} load={load} queryKey="transfer-from" error={errors.from} />
              <Picker label="To" required value={to} onChange={(v) => { setTo(v); key.current = newIdempotencyKey(); }} load={load} queryKey="transfer-to" error={errors.to} />
              <Field label="Amount" required prefix="৳" value={amount} onChangeText={(v) => { setAmount(v); key.current = newIdempotencyKey(); }} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {(['today', 'yesterday'] as const).map((d) => {
                  const on = day === d;
                  return (
                    <Tap key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setDay(d)} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
                      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                        {d === 'today' ? 'Today' : 'Yesterday'}
                      </ThemedText>
                    </Tap>
                  );
                })}
              </View>
              <Field label="Note (optional)" value={note} onChangeText={setNote} />
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title="Move the money" variant="success" size="lg" loading={save.isPending} onPress={submit} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
