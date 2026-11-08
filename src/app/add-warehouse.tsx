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
import { ManageActions } from '@/components/manage-actions';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';
import { createWarehouse, deleteWarehouse, listWarehouses, updateWarehouse, type Warehouse, type WarehouseType } from '@/warehouses/api';
import { cleanCode, TYPE_WORDS } from '@/warehouses/logic';

/** Add a warehouse, or edit one (`?id=`): a name, a kind, and for a new one a code and the branch it belongs to. */
export default function AddWarehouseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const all = useQuery({ queryKey: ['warehouses'], queryFn: listWarehouses, enabled: !!id });
  const one = id ? all.data?.find((w) => w.id === id) : undefined;
  if (id && !one) return <View style={{ flex: 1 }}>{all.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <WarehouseForm place={one} />;
}

function WarehouseForm({ place }: { place?: Warehouse }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const [name, setName] = useState(place?.name ?? '');
  const [code, setCode] = useState(place?.code ?? '');
  const [kind, setKind] = useState<WarehouseType>(place?.type ?? 'MAIN');
  const [branch, setBranch] = useState<{ id: string; name: string } | null>(me?.active_branch ? { id: me.active_branch.id, name: me.active_branch.name } : null);
  const [errors, setErrors] = useState<{ name?: string; code?: string; branch?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['warehouses'] });
    router.back();
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the warehouse. Try again.');
  const save = useMutation({
    mutationFn: () => (place ? updateWarehouse(place.id, { name: name.trim(), type: kind }) : createWarehouse({ branch: branch!.id, code: cleanCode(code), name: name.trim(), type: kind })),
    onSuccess: () => {
      showToast({ text: place ? t('Saved: {name}', { name: name.trim() }) : t('Warehouse added: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => deleteWarehouse(place!.id),
    onSuccess: () => {
      showToast({ text: t('Warehouse deleted.') });
      done();
    },
    onError: fail,
  });

  function submit() {
    const e = { ...(name.trim() ? {} : { name: 'Enter the warehouse name.' }), ...(place || cleanCode(code) ? {} : { code: 'Enter a short code, like STORE-2.' }), ...(place || branch ? {} : { branch: 'Choose a branch.' }) };
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: place ? t('Edit Warehouse') : t('Add Warehouse') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Warehouse name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              {place ? null : <Field label="Code" required value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} error={errors.code} hint="A short code. It cannot be changed later." />}
              {place ? null : <Picker label="Branch" required value={branch} onChange={setBranch} load={async (s) => (await listBranches()).filter((b) => b.is_active && (!s || b.name.toLowerCase().includes(s.toLowerCase())))} queryKey="branches" error={errors.branch} />}
              <View style={{ gap: Spacing.two }}>
                <ThemedText type="smallMedium" themeColor="textSecondary">
                  Kind of place
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                  {TYPE_WORDS.map((k) => {
                    const on = kind === k.key;
                    return (
                      <Tap key={k.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setKind(k.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
                        <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                          {k.label}
                        </ThemedText>
                      </Tap>
                    );
                  })}
                </View>
              </View>
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title={place ? 'Save changes' : 'Add warehouse'} size="lg" loading={save.isPending} onPress={submit} />
            {place ? <ManageActions noun="warehouse" active canEdit={false} canDelete={perms.includes('warehouse.delete')} busy={remove.isPending} message="The warehouse is removed. This only works for a place with no stock." onEdit={() => {}} onDelete={() => remove.mutate()} onActivate={() => {}} /> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
