import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { listCategories } from '@/money/api';
import { createRegular, getRegular, updateRegular, type Direction, type Frequency, type Regular } from '@/regular/api';
import { DIRECTIONS, FREQUENCIES, regularBody, validateRegular } from '@/regular/logic';
import { showToast } from '@/ui/toast';

/** Set up something that repeats, like rent or a bill, or change one (`?id=`). */
export default function AddRegularPaymentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useQuery({ queryKey: ['regular', 'one', id], queryFn: () => getRegular(id as string), enabled: !!id });
  if (id && !one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <RegularForm item={one.data} />;
}

function RegularForm({ item }: { item?: Regular }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(item?.name ?? '');
  const [kind, setKind] = useState<Direction>(item?.kind ?? 'EXPENSE');
  const [category, setCategory] = useState<{ id: string; name: string } | null>(item ? { id: item.category_id, name: item.category_name } : null);
  const [amount, setAmount] = useState(item ? String(Number(item.amount)) : '');
  const [frequency, setFrequency] = useState<Frequency>(item?.frequency ?? 'MONTHLY');
  const [start, setStart] = useState(item?.start_date ?? localDateISO(new Date()));
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [errors, setErrors] = useState<{ name?: string; categoryId?: string; amount?: string; start?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body = regularBody({ name, kind, categoryId: category?.id ?? '', amount, frequency, start }, notes);
      return item ? updateRegular(item.id, body) : createRegular(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['regular'] });
      showToast({ text: item ? t('Saved: {name}', { name: name.trim() }) : t('Added: {name}', { name: name.trim() }) });
      router.back();
    },
    onError: (e) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save this. Try again.'),
  });
  function submit() {
    const e = validateRegular({ name, kind, categoryId: category?.id ?? '', amount, frequency, start });
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }
  const chips = <K extends string>(title: string, opts: { key: K; label: string }[], value: K, set: (k: K) => void) => (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {opts.map((o) => {
          const on = value === o.key;
          return (
            <Tap key={o.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => set(o.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {t(o.label)}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: item ? t('Edit Regular Payment') : t('Add Regular Payment') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="What is it for?" required value={name} onChangeText={setName} autoCapitalize="words" placeholder="Shop rent" error={errors.name} />
              {chips('Money in or out', DIRECTIONS, kind, (k) => { setKind(k); setCategory(null); })}
              <Picker label="Kind" required value={category} onChange={setCategory} load={async (s) => (await listCategories(kind)).filter((c) => !s || c.name.toLowerCase().includes(s.toLowerCase()))} queryKey={`regular-cat-${kind}`} error={errors.categoryId} />
              <Field label="Amount each time" required prefix="৳" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
              {chips('How often', FREQUENCIES, frequency, setFrequency)}
              <Field label="First due on" required value={start} onChangeText={setStart} placeholder="2026-12-01" keyboardType="numbers-and-punctuation" error={errors.start} />
              <Field label="Note (optional)" value={notes} onChangeText={setNotes} />
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={item ? 'Save changes' : 'Add'} size="lg" loading={save.isPending} onPress={submit} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
