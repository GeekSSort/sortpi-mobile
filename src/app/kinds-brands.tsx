import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { addBrand, addCategory, listBrandRows, listCategoryRows, removeBrand, removeCategory, renameBrand, renameCategory } from '@/catalog/api';
import { canNest, categoryTree, createBody, describeCatalogError, emptyOnes, nameProblem, renameBody, type Kind, type TreeRow } from '@/catalog/manage';
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
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Pill } from '@/products/variant-card';
import { showToast } from '@/ui/toast';

/** The shop's kinds of item and its brands: see how many items each holds, add one, rename it, remove one nothing uses. */
export default function KindsAndBrandsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const seesKinds = perms.includes('category.view');
  const seesBrands = perms.includes('brand.view');
  const [which, setWhich] = useState<Kind>(seesKinds ? 'category' : 'brand');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<{ mode: 'add'; parent: TreeRow | null } | { mode: 'edit'; row: TreeRow } | null>(null);
  const kinds = useQuery({ queryKey: ['catalog-manage', 'category'], queryFn: listCategoryRows, enabled: seesKinds });
  const brands = useQuery({ queryKey: ['catalog-manage', 'brand'], queryFn: listBrandRows, enabled: seesBrands });
  const list = which === 'category' ? kinds : brands;
  const tree: TreeRow[] = which === 'category' ? categoryTree(kinds.data ?? []) : (brands.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ ...b, depth: 0, children: 0 }));
  const q = search.trim().toLowerCase();
  const shown = q ? tree.filter((r) => r.name.toLowerCase().includes(q)) : tree;
  const empty = emptyOnes(tree).length;
  const canAdd = perms.includes(`${which}.create`);

  if (!seesKinds && !seesBrands) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner or manager.</Notice>
      </View>
    );
  }

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {seesKinds && seesBrands ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {(['category', 'brand'] as const).map((k) => {
            const on = which === k;
            return (
              <Tap key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setWhich(k); setSearch(''); }} style={{ flex: 1, minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border }}>
                <Icon name={k === 'category' ? 'Package' : 'Tag'} size={18} color={on ? theme.brandText : theme.textSecondary} />
                <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                  {k === 'category' ? 'Kinds of item' : 'Brands'}
                </ThemedText>
              </Tap>
            );
          })}
        </View>
      ) : null}
      {list.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label={which === 'category' ? 'Kinds of item' : 'Brands'} icon={which === 'category' ? 'Package' : 'Tag'} value={String(tree.length)} />
          <ToneTile label="Not used" icon={empty > 0 ? 'TriangleAlert' : 'CheckCircle'} tone={empty > 0 ? 'warn' : 'good'} value={String(empty)} note={empty > 0 ? t('You can remove these') : undefined} />
        </View>
      ) : null}
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name" autoCapitalize="none" autoCorrect={false} />
      {list.isError ? <ErrorState message={t('Could not load this list.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Kinds and brands'), headerRight: canAdd ? () => <HeaderAction title="Add" icon="Plus" onPress={() => setSheet({ mode: 'add', parent: null })} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={shown}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <KindRow row={item} onPress={() => setSheet({ mode: 'edit', row: item })} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          list.isPending ? (
            <SkeletonRows />
          ) : q ? (
            <EmptyState icon="Search" title="Nothing matches that" hint="Check the spelling." action={{ title: 'Clear search', onPress: () => setSearch('') }} />
          ) : (
            <EmptyState icon="Package" title="Nothing here yet" hint="Add the first one and it will show up here." action={canAdd ? { title: 'Add', onPress: () => setSheet({ mode: 'add', parent: null }) } : undefined} />
          )
        }
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      {sheet ? <EditSheet key={sheet.mode === 'edit' ? sheet.row.id : `add-${sheet.parent?.id ?? 'top'}`} kind={which} sheet={sheet} rows={tree} perms={perms} onClose={() => setSheet(null)} onAddInside={(parent) => setSheet({ mode: 'add', parent })} /> : null}
    </View>
  );
}

/** One kind or brand: a bar (green when items use it, orange when nothing does), its name indented under its parent, and how many items it holds. */
function KindRow({ row, onPress }: { row: TreeRow; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const unused = row.product_count === 0 && row.children === 0;
  const fg = unused ? theme.warning : theme.success;
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${row.name}, ${t('{n} items', { n: row.product_count })}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 14, paddingRight: Spacing.three, paddingLeft: Spacing.three + row.depth * 20, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      {row.depth > 0 ? <Icon name="ChevronRight" size={14} color={theme.textMuted} /> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={2} literal>
          {row.name}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {unused ? <Pill icon="TriangleAlert" text={t('Nothing in it')} fg={theme.warning} soft={theme.warningSoft} line={`${theme.warning}55`} /> : <Pill icon="CheckCircle" text={t('{n} items', { n: row.product_count })} fg={theme.success} soft={theme.successSoft} line={theme.successBorder} />}
          {row.children > 0 ? <Pill icon="Package" text={t('{n} kinds inside', { n: row.children })} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandSoftBorder} /> : null}
        </View>
      </View>
      <Icon name="ChevronRight" size={16} color={theme.textMuted} />
    </Tap>
  );
}

function EditSheet({ kind, sheet, rows, perms, onClose, onAddInside }: { kind: Kind; sheet: { mode: 'add'; parent: TreeRow | null } | { mode: 'edit'; row: TreeRow }; rows: TreeRow[]; perms: string[]; onClose: () => void; onAddInside: (parent: TreeRow) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const editing = sheet.mode === 'edit' ? sheet.row : null;
  const parent = sheet.mode === 'add' ? sheet.parent : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const siblings = kind === 'brand' ? rows : rows.filter((r) => (r.parent ?? null) === (editing ? editing.parent : (parent?.id ?? null)));
  const done = (text: string) => {
    haptics.success();
    showToast({ text });
    for (const k of ['catalog-manage', 'picker', 'products', 'categories']) void queryClient.invalidateQueries({ queryKey: [k] });
    onClose();
  };
  const save = useMutation({
    mutationFn: () => (editing ? (kind === 'brand' ? renameBrand(editing.id, renameBody(name)) : renameCategory(editing.id, renameBody(name))) : kind === 'brand' ? addBrand(createBody(name)) : addCategory(createBody(name, parent?.id) as { name: string; parent?: string })),
    onSuccess: () => done(editing ? t('Saved') : t('Added')),
    onError: () => haptics.warning(),
  });
  const remove = useMutation({ mutationFn: () => (kind === 'brand' ? removeBrand(editing!.id) : removeCategory(editing!.id)), onSuccess: () => done(t('Removed')), onError: () => haptics.warning() });
  const busy = save.isPending || remove.isPending;
  const err = save.error ?? remove.error;
  const shownErr = err ? describeCatalogError(err) : null;

  function submit() {
    const p = nameProblem(kind, name, siblings, editing?.id);
    setProblem(p);
    if (!p) save.mutate();
  }
  function askRemove() {
    if (!editing) return;
    Alert.alert(t('Remove “{name}”?', { name: editing.name }), t('Nothing uses it, so nothing else changes.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, remove it'), style: 'destructive', onPress: () => remove.mutate() }]);
  }

  const title = editing ? (kind === 'brand' ? 'Change brand' : 'Change kind') : parent ? 'Add a kind inside' : kind === 'brand' ? 'Add a brand' : 'Add a kind of item';
  return (
    <BottomSheet visible onClose={() => !busy && onClose()} title={title}>
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        {parent ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="Package" size={18} color={theme.brandText} />
            <ThemedText type="small" themeColor="textSecondary" literal>
              {t('Inside: {name}', { name: parent.name })}
            </ThemedText>
          </View>
        ) : null}
        {editing ? (
          <ThemedText type="small" themeColor="textSecondary" literal>
            {editing.product_count > 0 ? t('{n} items use this.', { n: editing.product_count }) : t('Nothing uses this yet.')}
          </ThemedText>
        ) : null}
        <Field label="Name" value={name} onChangeText={(v) => { setName(v); setProblem(null); save.reset(); }} error={problem ? t(problem) : undefined} autoFocus />
        {shownErr ? <Notice>{shownErr.n !== undefined ? t(shownErr.text, { n: shownErr.n }) : t(shownErr.text)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={busy} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={save.isPending} disabled={remove.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
        {editing && kind === 'category' && canNest(editing.depth) && perms.includes('category.create') ? <Button title="Add a kind inside this one" variant="secondary" disabled={busy} onPress={() => onAddInside(editing)} /> : null}
        {editing && perms.includes(`${kind}.delete`) && editing.product_count === 0 && editing.children === 0 ? (
          <Tap accessibilityRole="button" onPress={askRemove} disabled={busy} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1.5, borderColor: theme.dangerBorder }}>
            <Icon name="Trash2" size={20} color={theme.danger} />
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>
              Remove this
            </ThemedText>
          </Tap>
        ) : null}
        {editing && editing.product_count > 0 ? (
          <ThemedText type="caption" themeColor="textMuted">
            It cannot be removed while items use it.
          </ThemedText>
        ) : null}
      </View>
    </BottomSheet>
  );
}
