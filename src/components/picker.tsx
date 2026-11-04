import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Spacing } from '@/constants/theme';
import { buildCategoryRequest, buildUnitRequest, categoryProblem, defaultShortName, hasExactName, unitProblem, type NewUnitDraft } from '@/catalog/new-lookup';
import { createCategory, createUnit } from '@/catalog/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Field } from './field';
import { Icon } from './icons/icon';
import { Notice } from './notice';
import { ThemedText } from './themed-text';

type Option = { id: string; name: string };
type Props = { required?: boolean; label: string; value: Option | null; onChange: (o: Option) => void; load: (search?: string) => Promise<Option[]>; queryKey: string; error?: string; /** Lets the sheet make a new item when the list does not have it. Only for people allowed to. */ create?: 'category' | 'unit' };

/**
 * Choose one item from a server list (categories, units). The field shows the choice; tapping it slides up a sheet with
 * a search box and the list. The search goes to the server, so a shop with hundreds of categories stays quick.
 * With `create`, the sheet also offers to make the item that is missing, so the product does not have to wait for the web.
 */
export function Picker({ label, value, onChange, load, queryKey, error, required, create }: Props) {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<NewUnitDraft | null>(null); // set while the "new" form is showing
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = useQuery({ queryKey: ['picker', queryKey, search], queryFn: () => load(search.trim() || undefined), enabled: open, staleTime: 60_000 });
  const rawNoun = create === 'unit' ? 'unit' : 'category';
  const noun = t(rawNoun);

  function close() {
    setOpen(false);
    setSearch('');
    setDraft(null);
    setFailure(null);
  }

  function startCreate() {
    const name = search.trim();
    setFailure(null);
    setDraft({ name, shortName: defaultShortName(name), allowDecimal: false });
  }

  async function submit() {
    if (!draft) return;
    const problem = create === 'unit' ? unitProblem(draft) : categoryProblem(draft.name);
    if (problem) return setFailure(problem);
    setBusy(true);
    setFailure(null);
    try {
      const made = create === 'unit' ? await createUnit(buildUnitRequest(draft)) : await createCategory(buildCategoryRequest(draft.name));
      await qc.invalidateQueries({ queryKey: ['picker'] });
      await qc.invalidateQueries({ queryKey: ['units', 'default'] });
      onChange({ id: made.id, name: made.name ?? draft.name.trim() });
      close();
    } catch (e) {
      setFailure(e instanceof ApiError && e.status === 403 ? t('You are not allowed to add a {noun}.', { noun }) : e instanceof ApiError && (e.code === 'DUPLICATE_RESOURCE' || e.code === 'DUPLICATE_CATEGORY') ? t('There is already a {noun} with that name.', { noun }) : e instanceof ApiError && e.message ? e.message : t('Could not add the {noun}. Try again.', { noun }));
    } finally {
      setBusy(false);
    }
  }

  const typed = search.trim();
  const canOfferTyped = !!create && !!typed && !hasExactName(options.data ?? [], typed);

  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t(label)}: ${value?.name ?? t('not chosen')}`} onPress={() => setOpen(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <View pointerEvents="none">
          <Field label={label} required={required} value={value?.name ?? ''} placeholder="Choose…" editable={false} error={error} />
        </View>
        <View style={{ position: 'absolute', right: 12, bottom: error ? 34 : 12 }}>
          <Icon name="ChevronDown" size={18} color={theme.textMuted} />
        </View>
      </Pressable>
      <BottomSheet visible={open} onClose={close} title={draft ? t('New {noun}', { noun }) : label}>
        {draft ? (
          <View style={{ paddingHorizontal: Spacing.three, gap: Spacing.three }}>
            <Field label="Name" required value={draft.name} onChangeText={(name) => setDraft({ ...draft, name, shortName: create === 'unit' && draft.shortName === defaultShortName(draft.name) ? defaultShortName(name) : draft.shortName })} autoCapitalize="words" placeholder={create === 'unit' ? 'Kilogram' : 'Spices'} />
            {create === 'unit' ? (
              <>
                <Field label="Short name" required value={draft.shortName} onChangeText={(shortName) => setDraft({ ...draft, shortName })} autoCapitalize="none" placeholder="kg" hint="Prints beside quantities, like 2 kg." />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="bodyMedium">Sold in parts</ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      Allows 0.5 or 1.25, like kilograms and litres.
                    </ThemedText>
                  </View>
                  <Switch value={draft.allowDecimal} onValueChange={(allowDecimal) => setDraft({ ...draft, allowDecimal })} trackColor={{ true: theme.brand }} />
                </View>
              </>
            ) : null}
            {failure ? <Notice>{failure}</Notice> : null}
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Button title="Back" variant="secondary" onPress={() => { setDraft(null); setFailure(null); }} style={{ flex: 1 }} />
              <Button title={t('Create {noun}', { noun })} loading={busy} onPress={() => void submit()} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.two }}>
              <Field label="Search" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
            </View>
            {create ? <Row icon="Plus" strong title={canOfferTyped ? t('Create {noun} “{typed}”', { noun, typed }) : t('New {noun}', { noun })} onPress={startCreate} /> : null}
            {options.isPending ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : null}
            {options.isError ? (
              <ThemedText type="small" style={{ color: theme.danger, paddingHorizontal: Spacing.three }}>
                Could not load the list.
              </ThemedText>
            ) : null}
            {options.data?.length === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={{ paddingHorizontal: Spacing.three, paddingVertical: Spacing.two }}>
                {create ? t('No {noun} matches. Create it above.', { noun }) : 'Nothing matches.'}
              </ThemedText>
            ) : null}
            {options.data?.slice(0, 60).map((o) => (
              <Row key={o.id} title={o.name} selected={value?.id === o.id} onPress={() => { onChange(o); close(); }} />
            ))}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

function Row({ title, selected, strong, icon, onPress }: { title: string; selected?: boolean; strong?: boolean; icon?: 'Plus'; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress} android_ripple={{ color: theme.backgroundSelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      {icon ? <Icon name={icon} size={20} color={theme.brand} /> : null}
      <ThemedText type={strong ? 'bodyMedium' : 'body'} literal style={{ flex: 1, color: strong || selected ? theme.brandText : theme.text }}>
        {title}
      </ThemedText>
      {selected ? <Icon name="Check" size={20} color={theme.brand} /> : null}
    </Pressable>
  );
}
