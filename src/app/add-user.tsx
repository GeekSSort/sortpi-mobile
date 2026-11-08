import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createUser, deactivateUser, inviteUser, getUser, listBranches, listRoles, updateUser, type UserRow } from '@/admin/api';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ManageActions } from '@/components/manage-actions';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { toggleName, validateUser, type UserErrors } from '@/roles/user';
import { showToast } from '@/ui/toast';

/** Add a person who can sign in, or change one (`?id=`): name, phone, what they may do (roles) and where (branches). Needs `user.create` / `.update` / `.delete`. */
export default function AddUserScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useQuery({ queryKey: ['access', 'user-one', id], queryFn: () => getUser(id as string), enabled: !!id });
  if (id && !one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : <View style={{ padding: Spacing.three }}><Notice>This person could not be found.</Notice></View>}</View>;
  return <UserForm person={one.data} />;
}

function UserForm({ person }: { person?: UserRow }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const [name, setName] = useState(person?.full_name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(person?.roles ?? []);
  const [branches, setBranches] = useState<string[]>(person?.branches ?? []);
  const [errors, setErrors] = useState<UserErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const roleList = useQuery({ queryKey: ['access', 'roles'], queryFn: listRoles });
  const branchList = useQuery({ queryKey: ['access', 'branches'], queryFn: listBranches });

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['access'] });
    router.back();
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save this person. Try again.');
  const save = useMutation({
    mutationFn: () => {
      const body = { full_name: name.trim(), phone: phone.trim(), roles, branches };
      return person ? updateUser(person.id, body) : createUser({ ...body, email: email.trim(), password });
    },
    onSuccess: () => {
      showToast({ text: person ? t('Saved: {name}', { name: name.trim() }) : t('Added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const off = useMutation({ mutationFn: () => deactivateUser(person!.id), onSuccess: () => { showToast({ text: t('Switched off. They can no longer sign in.') }); done(); }, onError: fail });
  const on = useMutation({ mutationFn: () => updateUser(person!.id, { is_active: true }), onSuccess: () => { showToast({ text: t('Switched on.') }); done(); }, onError: fail });
  const invite = useMutation({ mutationFn: () => inviteUser(person!.id), onSuccess: () => showToast({ text: t('A sign-in link was emailed.') }), onError: fail });

  function submit() {
    const e = validateUser({ email, name, phone, password, roles }, !person);
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }
  const chips = (title: string, options: { key: string; label: string }[], chosen: string[], toggle: (k: string) => void, error?: string) => (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {options.map((o) => {
          const sel = chosen.includes(o.key);
          return (
            <Tap key={o.key} accessibilityRole="button" accessibilityState={{ selected: sel }} onPress={() => toggle(o.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: sel ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: sel ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: sel ? theme.brandText : theme.textSecondary }} literal>
                {o.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {error ? <ThemedText type="caption" style={{ color: theme.danger }}>{t(error)}</ThemedText> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: person ? t('Edit person') : t('Add a person') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Full name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              {person ? (
                <ThemedText type="small" themeColor="textMuted" selectable literal>
                  {person.email}
                </ThemedText>
              ) : (
                <Field label="Email" required value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} error={errors.email} />
              )}
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              {person ? null : <Field label="Password" required value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} error={errors.password} hint="Tell them the password. They can change it later." />}
            </View>
            {chips('What they may do', (roleList.data ?? []).map((r) => ({ key: r.name, label: r.name })), roles, (k) => setRoles((l) => toggleName(l, k)), errors.roles)}
            {(branchList.data ?? []).length > 1 ? chips('Which branches', (branchList.data ?? []).filter((b) => b.is_active).map((b) => ({ key: b.id, label: b.name })), branches, (k) => setBranches((l) => toggleName(l, k))) : null}
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={person ? 'Save changes' : 'Add person'} size="lg" loading={save.isPending} onPress={submit} />
            {person && perms.includes('user.create') && person.is_active ? <Button title="Email a sign-in link" variant="secondary" loading={invite.isPending} onPress={() => invite.mutate()} /> : null}
            {person ? <ManageActions noun="person" active={person.is_active} canEdit={false} canDelete={perms.includes('user.delete') && person.id !== me?.id} busy={off.isPending || on.isPending} message="They are switched off and can no longer sign in. Their past work stays on record, and you can switch them on again." onEdit={() => {}} onDelete={() => off.mutate()} onActivate={() => on.mutate()} /> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
