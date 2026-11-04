import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Pill } from '@/products/variant-card';
import { addUnit, listUnitRows, resolvedSettings, saveSetting, type UnitRow } from '@/settings/api';
import { describeSettingsError, KEYS, presetAdded, readShop, UNIT_PRESETS, unitBody, unitProblem } from '@/settings/logic';
import { showToast } from '@/ui/toast';

/** The kinds of measure an item is counted in (piece, kilogram, litre). One can be the usual: new items start in it. */
export default function StockTypesScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('unit.view');
  const canAdd = perms.includes('unit.create');
  const canSetUsual = perms.includes('settings.update');
  const units = useQuery({ queryKey: ['settings', 'units'], queryFn: listUnitRows, enabled: canSee });
  const settings = useQuery({ queryKey: ['settings', 'resolved'], queryFn: resolvedSettings, enabled: perms.includes('settings.view') });
  const usual = settings.data ? readShop(settings.data).activeUnit : null;
  const locked = !!settings.data && readShop(settings.data).ownHere.includes(KEYS.activeUnit);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<UnitRow | null>(null);
  const makeUsual = useMutation({
    mutationFn: (id: string) => saveSetting(KEYS.activeUnit, id),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Saved') });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeSettingsError(e)) });
    },
  });

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <Notice kind="info">A stock type decides how an item is counted. Only types that allow half units can be sold as 2.5 of something.</Notice>
      {locked ? <Notice kind="info">This branch has its own usual type. Change it on the computer.</Notice> : null}
      {units.isError ? <ErrorState message={t('Could not load this list.')} onRetry={() => void units.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Stock types'), headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => setAdding(true)} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={units.data ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UnitItem u={item} usual={item.id === usual} onPress={canSetUsual && !locked ? () => setPicked(item) : undefined} />}
        ListHeaderComponent={header}
        ListEmptyComponent={units.isPending ? <SkeletonRows /> : <EmptyState icon="Package" title="No stock types yet" hint="Add one, like Piece or Kilogram." action={canAdd ? { title: 'Add', onPress: () => setAdding(true) } : undefined} />}
        refreshing={units.isRefetching}
        onRefresh={() => void units.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <ActionSheet
        title={picked?.name ?? null}
        actions={picked ? [picked.id === usual ? { title: t('Stop using as the usual one'), icon: 'X' as const, onPress: () => makeUsual.mutate('') } : { title: t('Make this the usual one'), icon: 'CheckCircle' as const, onPress: () => makeUsual.mutate(picked.id) }] : []}
        onClose={() => setPicked(null)}
      />
      {adding ? <AddSheet existing={units.data ?? []} onClose={() => setAdding(false)} /> : null}
    </View>
  );
}

function UnitItem({ u, usual, onPress }: { u: UnitRow; usual: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={u.name} onPress={onPress} disabled={!onPress} style={{ gap: 6, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: usual ? theme.success : theme.border, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <ThemedText type="bodyMedium" numberOfLines={1} literal>
        {`${u.name} (${u.short_name})`}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {usual ? <Pill icon="CheckCircle" text={t('New items start in this')} fg={theme.success} soft={theme.successSoft} line={theme.successBorder} /> : null}
        <Pill icon={u.allow_decimal ? 'Ruler' : 'Package'} text={u.allow_decimal ? t('Half units allowed') : t('Whole numbers only')} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandSoftBorder} />
      </View>
    </Tap>
  );
}

function AddSheet({ existing, onClose }: { existing: UnitRow[]; onClose: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [short, setShort] = useState('');
  const [decimals, setDecimals] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => addUnit(unitBody(name, short, decimals)),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Added') });
      for (const k of ['settings', 'picker', 'products']) void queryClient.invalidateQueries({ queryKey: [k] });
      onClose();
    },
    onError: () => haptics.warning(),
  });
  function submit() {
    const p = unitProblem(name, short, existing);
    setProblem(p);
    if (!p) save.mutate();
  }
  const offered = UNIT_PRESETS.filter((p) => !presetAdded(p, existing));
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title="Add a stock type">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        {offered.length ? (
          <View style={{ gap: 8 }}>
            <ThemedText type="caption" themeColor="textMuted">
              Tap a usual one
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {offered.map((p) => (
                <Tap key={p.name} accessibilityRole="button" accessibilityLabel={p.name} onPress={() => { setName(p.name); setShort(p.short); setDecimals(p.decimals); setProblem(null); save.reset(); }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.md, backgroundColor: name === p.name ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: name === p.name ? theme.brand : theme.inputBorder }}>
                  <ThemedText type="smallMedium" literal>
                    {`${p.name} (${p.short})`}
                  </ThemedText>
                </Tap>
              ))}
            </View>
          </View>
        ) : null}
        <Field label="Name" value={name} onChangeText={(v) => { setName(v); setProblem(null); save.reset(); }} placeholder="For example Dozen" />
        <Field label="Short name" value={short} onChangeText={(v) => { setShort(v); setProblem(null); save.reset(); }} placeholder="For example doz" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="bodyMedium">Allow half units</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Needed to sell 2.5 kg or 1.25 metres. Leave off for things sold whole.
            </ThemedText>
          </View>
          <Switch accessibilityLabel={t('Allow half units')} value={decimals} onValueChange={setDecimals} trackColor={{ true: theme.brand }} thumbColor={decimals ? theme.onBrand : undefined} />
        </View>
        {problem ? <Notice>{t(problem)}</Notice> : null}
        {save.error ? <Notice>{t(describeSettingsError(save.error))}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={save.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}
