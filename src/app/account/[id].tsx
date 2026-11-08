import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { getAccount, listAccountTx, type AccountTx } from '@/accounts/api';
import { TYPE_WORD } from '@/accounts/logic';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { HeaderAction } from '@/components/header-action';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

/** One account: what it holds and its entries, newest first. */
export default function AccountScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const canEdit = me?.permissions?.some((p) => p === 'account.update' || p === 'account.delete') ?? false;
  const acc = useQuery({ queryKey: ['accounts', 'one', id], queryFn: () => getAccount(id), enabled: !!id });
  const tx = useInfiniteQuery({ queryKey: ['accounts', 'tx', id], queryFn: ({ pageParam }) => listAccountTx(id, pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: !!id });
  const rows = tx.data?.pages.flatMap((p) => p.rows) ?? [];
  const a = acc.data;

  const head = (
    <View style={{ gap: 4, padding: Spacing.three }}>
      {acc.isError ? <ErrorState message={t('Could not load this account.')} onRetry={() => void acc.refetch()} /> : null}
      {a ? (
        <>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {`${a.code} · ${t(TYPE_WORD[a.account_type])}${a.is_active ? '' : ` · ${t('Inactive')}`}`}
          </ThemedText>
          <ThemedText type="hero" literal>
            {formatBDT(a.balance)}
          </ThemedText>
          {a.description ? (
            <ThemedText type="small" themeColor="textSecondary" literal>
              {a.description}
            </ThemedText>
          ) : null}
        </>
      ) : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: a?.name ?? t('Account'), headerRight: canEdit && a ? () => <HeaderAction title="Edit" icon="Pencil" onPress={() => router.push({ pathname: '/add-account', params: { id } })} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <TxLine row={item} />}
        ListHeaderComponent={head}
        ListEmptyComponent={tx.isPending ? <SkeletonRows /> : <EmptyState icon="Cash" title="No entries yet" hint="Money moving in or out of this account shows here." />}
        ListFooterComponent={tx.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => tx.hasNextPage && !tx.isFetchingNextPage && void tx.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={tx.isRefetching && !tx.isFetchingNextPage}
        onRefresh={() => void Promise.all([tx.refetch(), acc.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function TxLine({ row }: { row: AccountTx }) {
  const theme = useTheme();
  const debit = Number(row.debit) > 0;
  const amount = debit ? row.debit : row.credit;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 12, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="small" numberOfLines={2} literal>
          {row.description || row.reference_type}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>
          {`${row.date} · ${row.reference_type}`}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <ThemedText type="smallMedium" literal style={{ color: debit ? theme.success : theme.danger }}>
          {`${debit ? '+' : '−'}${formatBDT(amount, { dp: 0 })}`}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>
          {formatBDT(row.balance_after, { dp: 0 })}
        </ThemedText>
      </View>
    </View>
  );
}
