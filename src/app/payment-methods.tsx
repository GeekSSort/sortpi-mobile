import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View, useColorScheme } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { PayColors } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Pill } from '@/products/variant-card';
import { resolvedSettings, saveSetting } from '@/settings/api';
import { describeSettingsError, KEYS, methodProblem, moveUp, readShop, RECORDED_AS, serializeMethods, tenderOf, tidyName, unusedUsual, type Tender } from '@/settings/logic';
import { showToast } from '@/ui/toast';

const TENDER_ICON: Record<Tender, IconName> = { CASH: 'Cash', MOBILE: 'Phone', BANK: 'Bank', CARD: 'CreditCard', OTHER: 'Receipt' };

/** The ways customers can pay besides cash, in the order the till shows them. Add, rename, move up, remove. Each change saves the whole list at once. */
export default function PaymentMethodsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canEdit = perms.includes('settings.update');
  const q = useQuery({ queryKey: ['settings', 'resolved'], queryFn: resolvedSettings, enabled: perms.includes('settings.view') });
  const shop = q.data ? readShop(q.data) : null;
  const locked = !!shop?.ownHere.includes(KEYS.methods);
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; index: number } | null>(null);
  const write = useMutation({
    mutationFn: (list: string[]) => saveSetting(KEYS.methods, serializeMethods(list)),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Saved') });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSheet(null);
    },
    onError: () => haptics.warning(),
  });

  if (!perms.includes('settings.view')) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const list = shop?.methods ?? [];
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <Notice kind="info">Cash is always there. These are the other ways a customer can pay, in the order the till shows them.</Notice>
      {locked ? <Notice kind="info">This branch has its own list. Change it on the computer.</Notice> : null}
      {q.isError ? <ErrorState message={t('Could not load your settings.')} onRetry={() => void q.refetch()} /> : null}
    </View>
  );
  const editable = canEdit && !locked;
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Ways to pay'), headerRight: editable && shop ? () => <HeaderAction title="Add" icon="Plus" onPress={() => setSheet({ mode: 'add' })} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list}
        keyExtractor={(m) => m}
        renderItem={({ item, index }) => <MethodRow name={item} index={index} onPress={editable ? () => setSheet({ mode: 'edit', index }) : undefined} />}
        ListHeaderComponent={header}
        ListEmptyComponent={q.isPending ? <SkeletonRows /> : undefined}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      {sheet && shop ? <MethodSheet key={sheet.mode === 'edit' ? sheet.index : 'add'} sheet={sheet} list={list} busy={write.isPending} error={write.error} onSave={(next) => write.mutate(next)} onClose={() => setSheet(null)} reset={() => write.reset()} /> : null}
    </View>
  );
}

function useTenderStyle() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  return (tender: Tender) => {
    if (tender === 'OTHER' || tender === 'CASH') return { fg: theme.textSecondary, soft: theme.canvas, line: theme.border, bar: theme.textMuted };
    const pay = PayColors[tender];
    const ink = dark ? pay.ink.dark : pay.ink.light;
    return { fg: ink, soft: theme.card, line: ink, bar: pay.fill };
  };
}

function MethodRow({ name, index, onPress }: { name: string; index: number; onPress?: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const tender = tenderOf(name);
  const look = useTenderStyle()(tender);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={name} onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 14, paddingRight: Spacing.three, paddingLeft: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: look.bar, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <ThemedText type="bodyMedium" themeColor="textMuted" style={{ width: 22, fontVariant: ['tabular-nums'] }}>
        {index + 1}
      </ThemedText>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {name}
        </ThemedText>
        <Pill icon={TENDER_ICON[tender]} text={t('Recorded as {way}', { way: t(RECORDED_AS[tender]) })} fg={look.fg} soft={look.soft} line={look.line} />
      </View>
      {onPress ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
    </Tap>
  );
}

function MethodSheet({ sheet, list, busy, error, onSave, onClose, reset }: { sheet: { mode: 'add' } | { mode: 'edit'; index: number }; list: string[]; busy: boolean; error: unknown; onSave: (next: string[]) => void; onClose: () => void; reset: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const index = sheet.mode === 'edit' ? sheet.index : -1;
  const current = index >= 0 ? list[index] : undefined;
  const [name, setName] = useState(current ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const tidy = tidyName(name);
  const way = tidy ? tenderOf(tidy) : null;
  const look = useTenderStyle()(way ?? 'OTHER');

  function submit() {
    const p = methodProblem(tidy, list, current);
    setProblem(p);
    if (p) return;
    onSave(current !== undefined ? list.map((m, i) => (i === index ? tidy : m)) : [...list, tidy]);
  }
  function askRemove() {
    Alert.alert(t('Remove “{name}”?', { name: current ?? '' }), t('Customers will no longer see it as a way to pay. Old sales stay as they were.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, remove it'), style: 'destructive', onPress: () => onSave(list.filter((_, i) => i !== index)) }]);
  }
  return (
    <BottomSheet visible onClose={() => !busy && onClose()} title={current !== undefined ? 'Change this way to pay' : 'Add a way to pay'}>
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <Field label="Name" value={name} onChangeText={(v) => { setName(v); setProblem(null); reset(); }} error={problem ? t(problem) : undefined} placeholder="For example Gift voucher" autoFocus />
        {way ? <Pill icon={TENDER_ICON[way]} text={t('Recorded as {way}', { way: t(RECORDED_AS[way]) })} fg={look.fg} soft={look.soft} line={look.line} /> : null}
        {current === undefined && unusedUsual(list).length > 0 ? (
          <View style={{ gap: 8 }}>
            <ThemedText type="caption" themeColor="textMuted">
              Or tap a usual one
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {unusedUsual(list).map((m) => (
                <Tap key={m.code} accessibilityRole="button" accessibilityLabel={m.code} onPress={() => { setName(m.code); setProblem(null); reset(); }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: Radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.inputBorder }}>
                  <ThemedText type="smallMedium" literal>
                    {m.code}
                  </ThemedText>
                </Tap>
              ))}
            </View>
          </View>
        ) : null}
        {error ? <Notice>{t(describeSettingsError(error))}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={busy} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={busy} onPress={submit} style={{ flex: 1 }} />
        </View>
        {current !== undefined && index > 0 ? <Button title="Show it higher up" variant="secondary" disabled={busy} onPress={() => onSave(moveUp(list, index))} /> : null}
        {current !== undefined && list.length > 1 ? (
          <Tap accessibilityRole="button" onPress={askRemove} disabled={busy} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1.5, borderColor: theme.dangerBorder }}>
            <Icon name="Trash2" size={20} color={theme.danger} />
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>
              Remove this
            </ThemedText>
          </Tap>
        ) : current !== undefined ? (
          <ThemedText type="caption" themeColor="textMuted">
            Keep at least one way to pay besides cash.
          </ThemedText>
        ) : null}
      </View>
    </BottomSheet>
  );
}
