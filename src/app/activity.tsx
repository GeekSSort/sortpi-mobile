import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ACTION_CHIPS, amountOf, describeAction, detailLine, type Tone } from '@/admin/logic';
import { listActivity, type AuditRow } from '@/admin/api';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

/** What happened in the shop, newest first: who did it, when, and a colour for how much it deserves a look (red and orange are worth reading). */
export default function ActivityScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('audit.view') ?? false;
  const [chip, setChip] = useState(ACTION_CHIPS[0]);
  const list = useInfiniteQuery({
    queryKey: ['activity', chip.id],
    queryFn: ({ pageParam }) => listActivity({ action: chip.action, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see the activity. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {ACTION_CHIPS.map((c) => {
          const on = chip.id === c.id;
          return (
            <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setChip(c)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {c.label}
              </ThemedText>
            </Tap>
          );
        })}
      </ScrollView>
      {list.isError ? <ErrorState message={t('Could not load the activity.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Activity') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Entry row={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : <EmptyState icon="Search" title="Nothing here" hint="No activity of this kind yet." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function Entry({ row }: { row: AuditRow }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const look = describeAction(row.action);
  const tone: Record<Tone, { fg: string; soft: string }> = {
    good: { fg: theme.success, soft: theme.successSoft },
    info: { fg: theme.brandText, soft: theme.brandSoft },
    warn: { fg: theme.warning, soft: theme.warningSoft },
    bad: { fg: theme.danger, soft: theme.dangerSoft },
    plain: { fg: theme.textSecondary, soft: theme.canvas },
  };
  const c = tone[look.tone];
  const detail = detailLine(row);
  const amount = amountOf(row);
  const when = saleWhen(row.created_at);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: c.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft }}>
        <Icon name={look.icon} size={20} color={c.fg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" literal={!look.known}>
          {look.words}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary" literal>
            {detail.key === '{note}' ? detail.params.note : t(detail.key, detail.params)}
          </ThemedText>
        ) : null}
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {`${row.actor_email || t('The system')} · ${day}, ${when.time}`}
        </ThemedText>
      </View>
      {amount ? (
        <ThemedText type="smallMedium" style={{ color: c.fg }} literal>
          {formatBDT(amount, { dp: 0 })}
        </ThemedText>
      ) : null}
    </View>
  );
}
