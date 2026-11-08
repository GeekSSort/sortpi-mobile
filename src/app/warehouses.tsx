import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/icons/icon';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { listWarehouses, type Warehouse } from '@/warehouses/api';
import { typeWord } from '@/warehouses/logic';

/** The places stock is kept. Add, rename or remove one with `warehouse.create` / `.update` / `.delete`. */
export default function WarehousesScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('warehouse.view');
  const list = useQuery({ queryKey: ['warehouses'], queryFn: listWarehouses, enabled: allowed });
  const open = (w: Warehouse) => router.push({ pathname: '/add-warehouse', params: { id: w.id } });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see warehouses. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Warehouses'), headerRight: perms.includes('warehouse.create') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-warehouse')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" onPress={() => open(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: item.is_active ? theme.success : theme.border, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${item.code} · ${t(typeWord(item.type))}${item.is_default ? ` · ${t('Default')}` : ''}${item.is_active ? '' : ` · ${t('Inactive')}`}`}
              </ThemedText>
            </View>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the warehouses.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Package" title="No warehouses yet" hint="Add the places where you keep stock." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}
