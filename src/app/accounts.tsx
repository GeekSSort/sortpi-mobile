import { useWideLandscape } from '@/hooks/use-wide-landscape';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';

import { listAccounts } from '@/accounts/api';
import { groupAccounts } from '@/accounts/logic';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

/** The shop's accounts by kind, with what each holds. Needs `account.view`; adding needs `account.create`. */
export default function AccountsScreen() {
  const { readingWidth } = useWideLandscape();
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('account.view');
  const list = useQuery({ queryKey: ['accounts'], queryFn: listAccounts, enabled: allowed });
  const groups = groupAccounts(list.data ?? []);

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see accounts. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Accounts'), headerRight: perms.includes('account.create') ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-account')} /> : undefined }} />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={groups.map((g) => ({ ...g, data: g.items }))}
        keyExtractor={(a) => a.id}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two, backgroundColor: theme.canvas }}>
            <ThemedText type="smallMedium" themeColor="textSecondary">
              {section.label}
            </ThemedText>
            <ThemedText type="smallMedium" themeColor="textSecondary" literal>
              {formatBDT(section.total, { dp: 0 })}
            </ThemedText>
          </View>
        )}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" onPress={() => router.push({ pathname: '/account/[id]', params: { id: item.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, opacity: item.is_active ? 1 : 0.6 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${item.code}${item.is_active ? '' : ` · ${t('Inactive')}`}`}
              </ThemedText>
            </View>
            <ThemedText type="bodyMedium" literal style={{ color: Number(item.balance) < 0 ? theme.danger : theme.text }}>
              {formatBDT(item.balance, { dp: 0 })}
            </ThemedText>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the accounts.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Cash" title="No accounts yet" hint="Accounts hold your money: cash, bank and so on." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: Math.min(readingWidth, 1080), width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}
