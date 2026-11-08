import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createAccount, deleteAccount, getAccount, updateAccount, type Account, type AccountType } from '@/accounts/api';
import { TYPE_ORDER, TYPE_WORD, validateAccount } from '@/accounts/logic';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** Add an account, or change one (`?id=`). Needs `account.create` / `.update` / `.delete`. An account with entries cannot be deleted; switch it off instead. */
export default function AddAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useQuery({ queryKey: ['accounts', 'one', id], queryFn: () => getAccount(id as string), enabled: !!id });
  if (id && !one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <AccountForm account={one.data} />;
}

function AccountForm({ account }: { account?: Account }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const [name, setName] = useState(account?.name ?? '');
  const [code, setCode] = useState(account?.code ?? '');
  const [kind, setKind] = useState<AccountType>(account?.account_type ?? 'ASSET');
  const [description, setDescription] = useState(account?.description ?? '');
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['accounts'] });
    router.dismissTo('/accounts');
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the account. Try again.');
  const save = useMutation({
    mutationFn: () => (account ? updateAccount(account.id, { name: name.trim(), description: description.trim() }) : createAccount({ code: code.trim(), name: name.trim(), account_type: kind, description: description.trim() })),
    onSuccess: () => {
      showToast({ text: account ? t('Saved: {name}', { name: name.trim() }) : t('Account added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const flip = useMutation({ mutationFn: () => updateAccount(account!.id, { is_active: !account!.is_active }), onSuccess: done, onError: fail });
  const remove = useMutation({
    mutationFn: () => deleteAccount(account!.id),
    onSuccess: () => {
      showToast({ text: t('Account deleted.') });
      done();
    },
    onError: fail,
  });

  function submit() {
    const e = validateAccount({ code, name }, !account);
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }
  function confirmDelete() {
    Alert.alert(t('Delete this account?'), t('This only works for an account with no entries. Otherwise switch it off.'), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: account ? t('Edit Account') : t('Add Account') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Account name" required value={name} onChangeText={setName} autoCapitalize="words" placeholder="Petty cash" error={errors.name} />
              {account ? null : <Field label="Account number" required value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="1150" error={errors.code} hint="It cannot be changed later." />}
              {account ? null : (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText type="smallMedium" themeColor="textSecondary">
                    Kind of account
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                    {TYPE_ORDER.map((k) => {
                      const on = kind === k;
                      return (
                        <Tap key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setKind(k)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
                          <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                            {TYPE_WORD[k]}
                          </ThemedText>
                        </Tap>
                      );
                    })}
                  </View>
                </View>
              )}
              <Field label="Note (optional)" value={description} onChangeText={setDescription} />
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={account ? 'Save changes' : 'Add account'} size="lg" loading={save.isPending} onPress={submit} />
            {account && perms.includes('account.update') ? <Button title={account.is_active ? 'Switch off' : 'Switch on'} variant="secondary" loading={flip.isPending} onPress={() => flip.mutate()} /> : null}
            {account && perms.includes('account.delete') ? <Button title="Delete this account" variant="secondary" loading={remove.isPending} onPress={confirmDelete} /> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
