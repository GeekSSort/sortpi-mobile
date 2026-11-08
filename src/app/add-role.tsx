import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createRole, deleteRole, listPermissions, listRoles, updateRole, type RoleRow } from '@/admin/api';
import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { groupPerms, moduleState, roleBody, toggleModule, toggleOne, validateRole } from '@/roles/logic';
import { showToast } from '@/ui/toast';

/** Make a role, or change one (`?id=`): a name and what its people may do, module by module. Needs `role.create` / `.update` / `.delete`. */
export default function AddRoleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const all = useQuery({ queryKey: ['access', 'roles'], queryFn: listRoles, enabled: !!id });
  const one = id ? all.data?.find((r) => r.id === id) : undefined;
  if (id && !one) return <View style={{ flex: 1 }}>{all.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <RoleForm role={one} />;
}

function RoleForm({ role }: { role?: RoleRow }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [picked, setPicked] = useState<string[]>(role?.permissions ?? []);
  const [open, setOpen] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ name?: string; permissions?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const perms = useQuery({ queryKey: ['access', 'permissions'], queryFn: listPermissions, staleTime: 10 * 60_000 });
  const groups = groupPerms(perms.data ?? []);
  const canDelete = !!role && !role.is_system && (me?.permissions?.includes('role.delete') ?? false);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['access'] });
    router.back();
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the role. Try again.');
  const save = useMutation({
    mutationFn: () => (role ? updateRole(role.id, roleBody({ name, description, permissions: picked })) : createRole(roleBody({ name, description, permissions: picked }))),
    onSuccess: () => {
      showToast({ text: role ? t('Saved: {name}', { name: name.trim() }) : t('Role added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => deleteRole(role!.id),
    onSuccess: () => {
      showToast({ text: t('Role deleted.') });
      done();
    },
    onError: fail,
  });

  function submit() {
    const e = validateRole({ name, description, permissions: picked });
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }
  function confirmDelete() {
    Alert.alert(t('Delete this role?'), t('People who have it lose what it allowed.'), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, delete'), style: 'destructive', onPress: () => remove.mutate() },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: role ? t('Edit Role') : t('Add Role') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Role name" required value={name} onChangeText={setName} autoCapitalize="words" placeholder="Cashier" error={errors.name} />
              <Field label="What is this role for? (optional)" value={description} onChangeText={setDescription} />
            </View>

            <ThemedText type="bodyMedium">What this role may do</ThemedText>
            {errors.permissions ? <Notice>{errors.permissions}</Notice> : null}
            {perms.isError ? <ErrorState message={t('Could not load the list of things a role can allow.')} onRetry={() => void perms.refetch()} /> : null}
            {perms.isPending ? <SkeletonRows count={4} /> : null}
            <View style={{ borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
              {groups.map((g, gi) => {
                const codes = g.items.map((p) => p.code);
                const state = moduleState(picked, codes);
                const expanded = open.includes(g.module);
                return (
                  <View key={g.module} style={{ borderTopWidth: gi === 0 ? 0 : 1, borderTopColor: theme.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three }}>
                      <Tap accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen((o) => (o.includes(g.module) ? o.filter((x) => x !== g.module) : [...o, g.module]))} style={{ flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                        <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={18} color={theme.textMuted} />
                        <ThemedText type="bodyMedium" literal>
                          {g.label}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textMuted" literal>
                          {state === 'none' ? '' : state === 'all' ? t('All') : `${codes.filter((c) => picked.includes(c)).length}/${codes.length}`}
                        </ThemedText>
                      </Tap>
                      <Switch accessibilityLabel={g.label} value={state === 'all'} onValueChange={() => setPicked((p) => toggleModule(p, codes))} trackColor={{ true: theme.brand }} />
                    </View>
                    {expanded
                      ? g.items.map((p) => (
                          <View key={p.code} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: Spacing.five, paddingRight: Spacing.three, paddingVertical: 8, backgroundColor: theme.canvas }}>
                            <ThemedText type="small" style={{ flex: 1 }} literal>
                              {p.description || p.code}
                            </ThemedText>
                            <Switch accessibilityLabel={p.description || p.code} value={picked.includes(p.code)} onValueChange={() => setPicked((s) => toggleOne(s, p.code))} trackColor={{ true: theme.brand }} />
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}
            </View>

            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={role ? 'Save changes' : 'Add role'} size="lg" loading={save.isPending} onPress={submit} />
            {canDelete ? <Button title="Delete this role" variant="secondary" loading={remove.isPending} onPress={confirmDelete} /> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
