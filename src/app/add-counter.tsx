import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listBranches } from '@/admin/api';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { createCounter, listCounters, updateCounter, type Counter } from '@/counters/api';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { cleanCode } from '@/warehouses/logic';
import { showToast } from '@/ui/toast';

/** Add a counter, or change one (`?id=`). Needs `branch.update`. A counter is taken out of use, never deleted. */
export default function AddCounterScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const all = useQuery({ queryKey: ['counters'], queryFn: listCounters, enabled: !!id });
  const one = id ? all.data?.find((c) => c.id === id) : undefined;
  if (id && !one) return <View style={{ flex: 1 }}>{all.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <CounterForm counter={one} />;
}

function CounterForm({ counter }: { counter?: Counter }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const [name, setName] = useState(counter?.name ?? '');
  const [code, setCode] = useState(counter?.code ?? '');
  const [branch, setBranch] = useState<{ id: string; name: string } | null>(me?.active_branch ? { id: me.active_branch.id, name: me.active_branch.name } : null);
  const [errors, setErrors] = useState<{ name?: string; code?: string; branch?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['counters'] });
    router.back();
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the counter. Try again.');
  const save = useMutation({
    mutationFn: () => (counter ? updateCounter(counter.id, { name: name.trim(), code: cleanCode(code) }) : createCounter({ branch_id: branch!.id, name: name.trim(), code: cleanCode(code) })),
    onSuccess: () => {
      showToast({ text: counter ? t('Saved: {name}', { name: name.trim() }) : t('Counter added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const flip = useMutation({
    mutationFn: () => updateCounter(counter!.id, { is_active: !counter!.is_active }),
    onSuccess: () => {
      showToast({ text: counter!.is_active ? t('Taken out of use.') : t('Switched on.') });
      done();
    },
    onError: fail,
  });

  function submit() {
    const e = { ...(name.trim() ? {} : { name: 'Enter the counter name.' }), ...(cleanCode(code) ? {} : { code: 'Enter a short code, like C1.' }), ...(counter || branch ? {} : { branch: 'Choose a branch.' }) };
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: counter ? t('Edit Counter') : t('Add Counter') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Counter name" required value={name} onChangeText={setName} autoCapitalize="words" placeholder="Counter 1" error={errors.name} />
              <Field label="Code" required value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="C1" error={errors.code} />
              {counter ? null : <Picker label="Branch" required value={branch} onChange={setBranch} load={async (s) => (await listBranches()).filter((b) => b.is_active && (!s || b.name.toLowerCase().includes(s.toLowerCase())))} queryKey="branches" error={errors.branch} />}
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={counter ? 'Save changes' : 'Add counter'} size="lg" loading={save.isPending} onPress={submit} />
            {counter ? <Button title={counter.is_active ? 'Take out of use' : 'Switch on'} variant="secondary" loading={flip.isPending} disabled={!!counter.in_use_by} onPress={() => flip.mutate()} /> : null}
            {counter?.in_use_by ? <Notice kind="info">{t('A shift is open here, so it cannot be taken out of use yet.')}</Notice> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
