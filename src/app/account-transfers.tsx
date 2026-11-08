import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { listTransfers, voidTransfer, type Transfer } from '@/accounts/api';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { showToast } from '@/ui/toast';

/** Money moved between your own accounts, newest first. Looking needs `account.view`; moving or voiding needs `finance.manage_accounts`. */
export default function AccountTransfersScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('account.view');
  const canMove = perms.includes('finance.manage_accounts');
  const list = useInfiniteQuery({ queryKey: ['transfers'], queryFn: ({ pageParam }) => listTransfers(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['transfers'] });
    void qc.invalidateQueries({ queryKey: ['accounts'] });
  };
  const gone = useMutation({
    mutationFn: (id: string) => voidTransfer(id),
    onSuccess: () => {
      refresh();
      showToast({ text: t('Transfer cancelled. The money is back.') });
    },
    onError: (e) => Alert.alert(t('Could not cancel it'), e instanceof ApiError ? e.message : t('Try again.')),
  });
  function askVoid(tr: Transfer) {
    Alert.alert(t('Cancel this transfer?'), t('The money goes back to {name}.', { name: tr.from_account_name }), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, cancel it'), style: 'destructive', onPress: () => gone.mutate(tr.id) },
    ]);
  }

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see transfers. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Account Transfers'), headerRight: canMove ? () => <HeaderAction title="Add" icon="Plus" onPress={() => router.push('/add-transfer')} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" disabled={!canMove} onLongPress={() => askVoid(item)} onPress={() => canMove && askVoid(item)} style={{ gap: 4, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
                {`${item.from_account_name} → ${item.to_account_name}`}
              </ThemedText>
              <ThemedText type="bodyMedium" literal>
                {formatBDT(item.amount, { dp: 0 })}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
              {[item.date, item.reference_no, item.description].filter(Boolean).join(' · ')}
            </ThemedText>
          </Tap>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the transfers.')} onRetry={() => void list.refetch()} /> : canMove && rows.length > 0 ? <ThemedText type="caption" themeColor="textMuted" style={{ padding: Spacing.three }}>{t('Tap a transfer to cancel it.')}</ThemedText> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Cash" title="No transfers yet" hint="Move money between cash, bank and your other accounts." />}
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
