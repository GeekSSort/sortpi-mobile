import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createPriceGroup, deletePriceGroup, listPriceGroups, updatePriceGroup, type PriceGroup } from '@/groups/api';
import { percentWord, validateGroup } from '@/groups/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** Kinds of customer sold to at an agreed percent off (a school, a mechanic). Reading needs `customer.view`; changing needs `customer.update`/`customer.delete`. */
export default function PriceGroupsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('customer.view');
  const canEdit = perms.includes('customer.update');
  const canDelete = perms.includes('customer.delete');
  const list = useQuery({ queryKey: ['price-groups'], queryFn: listPriceGroups, enabled: allowed });
  const [editing, setEditing] = useState<PriceGroup | 'new' | null>(null);
  const [name, setName] = useState('');
  const [percent, setPercent] = useState('');
  const [errors, setErrors] = useState<{ name?: string; percent?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);

  const open = (g: PriceGroup | 'new') => {
    setEditing(g);
    setName(g === 'new' ? '' : g.name);
    setPercent(g === 'new' ? '' : String(Number(g.discount_percent)));
    setErrors({});
    setFailure(null);
  };
  const done = () => {
    void qc.invalidateQueries({ queryKey: ['price-groups'] });
    setEditing(null);
  };
  const fail = (e: unknown) => setFailure(e instanceof ApiError && e.message ? e.message : 'Could not save the group. Try again.');
  const save = useMutation({
    mutationFn: () => (editing && editing !== 'new' ? updatePriceGroup(editing.id, { name: name.trim(), discount_percent: percent.trim() }) : createPriceGroup({ name: name.trim(), discount_percent: percent.trim() })),
    onSuccess: () => {
      showToast({ text: t('Saved: {name}', { name: name.trim() }) });
      done();
    },
    onError: fail,
  });
  const flip = useMutation({ mutationFn: (g: PriceGroup) => updatePriceGroup(g.id, { is_active: !g.is_active }), onSuccess: done, onError: fail });
  const remove = useMutation({
    mutationFn: (g: PriceGroup) => deletePriceGroup(g.id),
    onSuccess: () => {
      showToast({ text: t('Group deleted.') });
      done();
    },
    onError: fail,
  });
  function submit() {
    const e = validateGroup({ name, percent });
    setErrors(e);
    setFailure(null);
    if (!Object.keys(e).length) save.mutate();
  }
  function confirmDelete(g: PriceGroup) {
    Alert.alert(t('Delete {name}?', { name: g.name }), t('Its customers are left without a group.'), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, delete'), style: 'destructive', onPress: () => remove.mutate(g) },
    ]);
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see price groups. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Price Groups'), headerRight: canEdit ? () => <HeaderAction title="Add" icon="Plus" onPress={() => open('new')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" disabled={!canEdit} onPress={() => open(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, opacity: item.is_active ? 1 : 0.6 }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="bodyMedium" literal>
                {item.name}
              </ThemedText>
              {item.is_active ? null : (
                <ThemedText type="caption" themeColor="textMuted">
                  {t('Inactive')}
                </ThemedText>
              )}
            </View>
            <ThemedText type="bodyMedium" style={{ color: theme.success }} literal>
              {percentWord(item.discount_percent)}
            </ThemedText>
            {canEdit ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the price groups.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Percent" title="No price groups yet" hint="A group gets an agreed percent off, like schools or mechanics." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <BottomSheet visible={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Price Group' : 'Edit Price Group'}>
        <View style={{ gap: Spacing.three }}>
          <Field label="Group name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
          <Field label="Percent off" required value={percent} onChangeText={setPercent} keyboardType="decimal-pad" placeholder="10" error={errors.percent} />
          {failure ? <Notice>{failure}</Notice> : null}
          <Button title="Save" variant="success" size="lg" loading={save.isPending} onPress={submit} />
          {editing && editing !== 'new' ? <Button title={editing.is_active ? 'Switch off' : 'Switch on'} variant="secondary" loading={flip.isPending} onPress={() => flip.mutate(editing)} /> : null}
          {editing && editing !== 'new' && canDelete ? <Button title="Delete this group" variant="secondary" loading={remove.isPending} onPress={() => confirmDelete(editing)} /> : null}
        </View>
      </BottomSheet>
    </View>
  );
}
