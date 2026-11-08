import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { listSeasons, markDownSeason, type Season } from '@/extras/api';
import { validateMarkdown } from '@/extras/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** The seasons and collections on your items, with how many items and how much stock each has. Mark a whole season down in one go. Needs `product.view`; marking down needs `product.update`. */
export default function SeasonsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('product.view');
  const canMark = perms.includes('product.update');
  const list = useQuery({ queryKey: ['seasons'], queryFn: listSeasons, enabled: allowed });
  const [pick, setPick] = useState<Season | null>(null);
  const [percent, setPercent] = useState('');
  const [ends, setEnds] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mark = useMutation({
    mutationFn: () => markDownSeason(pick!.season, percent.trim(), ends.trim() || undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers'] });
      showToast({ text: t('{season} is marked down.', { season: pick!.season }) });
      setPick(null);
    },
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : 'Could not mark it down. Try again.'),
  });
  function submit() {
    const e = validateMarkdown({ season: pick!.season, percent });
    setError(e.percent ?? (ends.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(ends.trim()) ? 'Enter the last day as 2026-12-31.' : null));
    if (!e.percent && (!ends.trim() || /^\d{4}-\d{2}-\d{2}$/.test(ends.trim()))) mark.mutate();
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see seasons. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Seasons') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(s) => s.season}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" disabled={!canMark} onPress={() => { setPick(item); setPercent(''); setEnds(''); setError(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" literal>
                {item.season}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${t('{n} items', { n: item.products })} · ${t('{n} in stock', { n: item.on_hand })}`}
              </ThemedText>
            </View>
            {canMark ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the seasons.')} onRetry={() => void list.refetch()} /> : canMark && (list.data ?? []).length > 0 ? <ThemedText type="caption" themeColor="textMuted" style={{ padding: Spacing.three }}>{t('Tap a season to mark all of it down.')}</ThemedText> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Tag" title="No seasons yet" hint="Give an item a season or collection and it shows here." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <BottomSheet visible={pick !== null} onClose={() => setPick(null)} title={pick ? t('Mark down {season}', { season: pick.season }) : ''}>
        <View style={{ gap: Spacing.three }}>
          <Field label="Percent off" required value={percent} onChangeText={setPercent} keyboardType="decimal-pad" placeholder="20" />
          <Field label="Until (optional)" value={ends} onChangeText={setEnds} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" hint="Leave empty to keep it until you end it." />
          {error ? <Notice>{error}</Notice> : null}
          <Button title="Mark it all down" variant="success" size="lg" loading={mark.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </View>
  );
}
