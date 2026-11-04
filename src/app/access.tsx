import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { listBranches, listRoles, listUsers, type BranchRow, type RoleRow, type UserRow } from '@/admin/api';
import { lastSeen } from '@/admin/logic';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { Pill } from '@/products/variant-card';

type Tab = 'users' | 'roles' | 'branches';

/** Who can use the shop's app and what they may do: people, roles and branches. To look at, not to change: changes are made on the computer. */
export default function AccessScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const can: Record<Tab, boolean> = { users: perms.includes('user.view'), roles: perms.includes('role.view'), branches: perms.includes('branch.view') };
  const first = (['users', 'roles', 'branches'] as const).find((k) => can[k]);
  const [tab, setTab] = useState<Tab | undefined>(first);
  const users = useInfiniteQuery({ queryKey: ['access', 'users'], queryFn: ({ pageParam }) => listUsers(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: can.users });
  const roles = useQuery({ queryKey: ['access', 'roles'], queryFn: listRoles, enabled: can.roles });
  const branches = useQuery({ queryKey: ['access', 'branches'], queryFn: listBranches, enabled: can.branches });

  if (!first || !tab) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const TABS: { id: Tab; label: string; icon: IconName }[] = [
    { id: 'users', label: 'People', icon: 'Users' },
    { id: 'roles', label: 'Roles', icon: 'ShieldCheck' },
    { id: 'branches', label: 'Branches', icon: 'Package' },
  ];
  const userRows = users.data?.pages.flatMap((p) => p.rows) ?? [];
  const q = tab === 'users' ? users : tab === 'roles' ? roles : branches;
  const data: (UserRow | RoleRow | BranchRow)[] = tab === 'users' ? userRows : tab === 'roles' ? (roles.data ?? []) : (branches.data ?? []);
  const total = tab === 'users' ? (users.data?.pages[0]?.total ?? 0) : data.length;
  const switchedOff = tab === 'users' ? userRows.filter((u) => !u.is_active).length : tab === 'branches' ? (branches.data ?? []).filter((b) => !b.is_active).length : 0;

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {TABS.filter((x) => can[x.id]).map((x) => {
          const on = tab === x.id;
          return (
            <Tap key={x.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTab(x.id)} style={{ flex: 1, minHeight: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border }}>
              <Icon name={x.icon} size={18} color={on ? theme.brandText : theme.textSecondary} />
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {x.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {q.data !== undefined || tab === 'users' ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label={TABS.find((x) => x.id === tab)!.label} icon={TABS.find((x) => x.id === tab)!.icon} value={String(total)} />
          {tab !== 'roles' ? <ToneTile label="Switched off" icon={switchedOff ? 'TriangleAlert' : 'CheckCircle'} tone={switchedOff ? 'warn' : 'good'} value={String(switchedOff)} /> : null}
        </View>
      ) : null}
      {q.isError ? <ErrorState message={t('Could not load this list.')} onRetry={() => void q.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Access') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={data}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (tab === 'users' ? <UserItem u={item as UserRow} /> : tab === 'roles' ? <RoleItem r={item as RoleRow} /> : <BranchItem b={item as BranchRow} />)}
        ListHeaderComponent={header}
        ListEmptyComponent={q.isPending ? <SkeletonRows /> : <EmptyState icon="Users" title="Nothing here yet" hint="This list is empty." />}
        ListFooterComponent={tab === 'users' && users.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => tab === 'users' && users.hasNextPage && !users.isFetchingNextPage && void users.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={q.isRefetching && !(tab === 'users' && users.isFetchingNextPage)}
        onRefresh={() => void q.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function Shell({ bar, children }: { bar: string; children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={{ gap: 6, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: bar, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>{children}</View>;
}

function UserItem({ u }: { u: UserRow }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const seen = lastSeen(u.last_login);
  const today = seen.key === 'Signed in today';
  return (
    <Shell bar={u.is_active ? theme.success : theme.border}>
      <ThemedText type="bodyMedium" numberOfLines={1} literal>
        {u.full_name}
      </ThemedText>
      <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} selectable literal>
        {u.email}
      </ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {u.roles.map((r) => <Pill key={r} icon="ShieldCheck" text={r} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandSoftBorder} />)}
        {!u.is_active ? <Pill icon="X" text={t('Switched off')} fg={theme.textMuted} soft={theme.canvas} line={theme.border} /> : <Pill icon={today ? 'CheckCircle' : 'Lock'} text={seen.n === undefined ? t(seen.key) : t(seen.key, { n: seen.n })} fg={today ? theme.success : theme.textSecondary} soft={today ? theme.successSoft : theme.canvas} line={today ? theme.successBorder : theme.border} />}
      </View>
    </Shell>
  );
}

function RoleItem({ r }: { r: RoleRow }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Shell bar={theme.brand}>
      <ThemedText type="bodyMedium" numberOfLines={1} literal>
        {r.name}
      </ThemedText>
      {r.description ? (
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={2} literal>
          {r.description}
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Pill icon="CheckCircle" text={t('{n} things it allows', { n: r.permissions.length })} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandSoftBorder} />
        {r.is_system ? <Pill icon="Lock" text={t('Built in')} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} /> : null}
      </View>
    </Shell>
  );
}

function BranchItem({ b }: { b: BranchRow }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Shell bar={b.is_active ? theme.success : theme.border}>
      <ThemedText type="bodyMedium" numberOfLines={1} literal>
        {b.name}
      </ThemedText>
      <ThemedText type="caption" themeColor="textMuted" numberOfLines={2} literal>
        {[b.code, b.phone, b.address].filter(Boolean).join(' · ')}
      </ThemedText>
      <Pill icon={b.is_active ? 'CheckCircle' : 'X'} text={b.is_active ? t('Open for business') : t('Switched off')} fg={b.is_active ? theme.success : theme.textMuted} soft={b.is_active ? theme.successSoft : theme.canvas} line={b.is_active ? theme.successBorder : theme.border} />
    </Shell>
  );
}
