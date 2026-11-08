import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { listCounters } from '@/counters/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

/** The till positions of your shops. Anyone at the till can look; adding and changing need `branch.update`. */
export default function CountersScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('pos.access');
  const canManage = perms.includes('branch.update');
  const list = useQuery({ queryKey: ['counters'], queryFn: listCounters, enabled: allowed });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see counters. Ask the owner or manager.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Counters'), headerRight: canManage ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-counter')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" disabled={!canManage} onPress={() => router.push({ pathname: '/add-counter', params: { id: item.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: !item.is_active ? theme.border : item.in_use_by ? theme.brand : theme.success, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${item.code} · ${item.branch_name}${item.in_use_by ? ` · ${t('In use by {name}', { name: item.in_use_by })}` : ''}${item.is_active ? '' : ` · ${t('Inactive')}`}`}
              </ThemedText>
            </View>
            {canManage ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the counters.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Lock" title="No counters yet" hint="A counter is a till position, like Counter 1." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}
