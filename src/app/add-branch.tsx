import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createBranch, deleteBranch, listBranches, updateBranch, type BranchRow } from '@/admin/api';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ManageActions } from '@/components/manage-actions';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** Add a branch, or edit one (`?id=`). Needs `branch.create` / `branch.update`; removing needs `branch.delete` and works only for a branch with no records. */
export default function AddBranchScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  // the list is already cached by the Branches tab; one branch is read out of it
  const all = useQuery({ queryKey: ['access', 'branches'], queryFn: listBranches, enabled: !!id });
  const one = id ? all.data?.find((b) => b.id === id) : undefined;
  if (id && !one) return <View style={{ flex: 1 }}>{all.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <BranchForm branch={one} />;
}

function BranchForm({ branch }: { branch?: BranchRow }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const [name, setName] = useState(branch?.name ?? '');
  const [code, setCode] = useState(branch?.code ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['access', 'branches'] });
    router.back();
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the branch. Try again.');
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), phone: phone.trim(), address: address.trim() };
      return branch ? updateBranch(branch.id, body) : createBranch({ ...body, code: code.trim().toUpperCase(), is_active: true });
    },
    onSuccess: () => {
      showToast({ text: branch ? t('Saved: {name}', { name: name.trim() }) : t('Branch added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const reopen = useMutation({ mutationFn: () => updateBranch(branch!.id, { is_active: true }), onSuccess: done, onError: fail });
  const remove = useMutation({
    mutationFn: () => deleteBranch(branch!.id),
    onSuccess: () => {
      showToast({ text: t('Branch deleted.') });
      done();
    },
    onError: fail,
  });

  function submit() {
    const e = { ...(name.trim() ? {} : { name: 'Enter the branch name.' }), ...(branch || code.trim() ? {} : { code: 'Enter a short code, like DHK.' }) };
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: branch ? t('Edit Branch') : t('Add Branch') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Branch name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              {branch ? null : <Field label="Code" required value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="DHK" error={errors.code} hint="A short code. It cannot be changed later." />}
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Field label="Address" value={address} onChangeText={setAddress} multiline />
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={branch ? 'Save changes' : 'Add branch'} size="lg" loading={save.isPending} onPress={submit} />
            {branch ? (
              <ManageActions noun="branch" active={branch.is_active} canEdit={false} canDelete={perms.includes('branch.delete')} busy={remove.isPending || reopen.isPending} message="The branch is removed. This only works for a branch with no sales or stock." onEdit={() => {}} onDelete={() => remove.mutate()} onActivate={() => reopen.mutate()} />
            ) : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
