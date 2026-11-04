import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { HeaderAction } from '@/components/header-action';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { Pill } from '@/products/variant-card';
import { formatQuantity } from '@/stock/status';
import { listTransfers, transferTotals } from '@/transfers/api';
import { useStatusLook } from '@/transfers/look';
import { CHIPS, sentOf, type Transfer } from '@/transfers/logic';

/** Goods moving between this shop's branches and shelves: what is on the way, what is waiting to be sent, what has arrived. */
export default function TransfersScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const router = useRouter();
  const allowed = me?.permissions?.includes('inventory.transfer') ?? false;
  const [chip, setChip] = useState(CHIPS[0]);
  const list = useQuery({ queryKey: ['transfers'], queryFn: listTransfers, enabled: allowed });
  const totals = useQuery({ queryKey: ['transfers-totals'], queryFn: transferTotals, enabled: allowed });
  const rows = (list.data ?? []).filter((r) => !chip.status || r.status === chip.status);

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const s = totals.data;
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {s ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="On the way" icon="ArrowUpRight" tone={s.in_transit ? 'warn' : undefined} value={String(s.in_transit)} onPress={() => setChip(CHIPS[1])} selected={chip.id === 'way'} />
          <ToneTile label="To send" icon="Pencil" value={String(s.draft)} onPress={() => setChip(CHIPS[2])} selected={chip.id === 'draft'} />
          <ToneTile label="Arrived" icon="CheckCircle" tone="good" value={String(s.received)} onPress={() => setChip(CHIPS[3])} selected={chip.id === 'done'} />
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {CHIPS.map((c) => {
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
      {list.isError ? <ErrorState message={t('Could not load the transfers.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Transfers'), headerRight: () => <HeaderAction title="New" icon="Plus" onPress={() => router.push('/new-transfer')} /> }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Row tr={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : <EmptyState icon="Package" title={chip.status ? 'Nothing here' : 'No transfers yet'} hint={chip.status ? 'No transfer is in this group.' : 'When goods are sent between your branches or shelves, they show up here.'} />}
        refreshing={list.isRefetching}
        onRefresh={() => void Promise.all([list.refetch(), totals.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function Row({ tr }: { tr: Transfer }) {
  const theme = useTheme();
  const router = useRouter();
  const { t, lang } = usePrefs();
  const look = useStatusLook()(tr.status);
  const when = saleWhen(tr.dispatched_at ?? tr.created_at);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const from = tr.from_branch_name && tr.from_branch_name !== tr.to_branch_name ? `${tr.from_branch_name} · ${tr.from_warehouse_name}` : tr.from_warehouse_name;
  const to = tr.from_branch_name && tr.from_branch_name !== tr.to_branch_name ? `${tr.to_branch_name} · ${tr.to_warehouse_name}` : tr.to_warehouse_name;
  return (
    <Tap accessibilityRole="button" accessibilityLabel={tr.reference_no} onPress={() => router.push({ pathname: '/transfer/[id]', params: { id: tr.id } })} style={{ gap: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: look.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <ThemedText type="bodyMedium" literal style={{ flex: 1 }}>
          {tr.reference_no}
        </ThemedText>
        <Icon name="ChevronRight" size={16} color={theme.textMuted} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ThemedText type="small" themeColor="textSecondary" literal numberOfLines={1} style={{ flexShrink: 1 }}>
          {from}
        </ThemedText>
        <Icon name="ArrowRight" size={14} color={theme.textMuted} />
        <ThemedText type="small" themeColor="textSecondary" literal numberOfLines={1} style={{ flexShrink: 1 }}>
          {to}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Pill icon={look.icon} text={t(look.words)} fg={look.fg} soft={look.soft} line={look.line} />
        <Pill icon="Package" text={t('{n} items · {q} units', { n: tr.items.length, q: formatQuantity(String(sentOf(tr)), null) })} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} />
        <Pill icon="Receipt" text={`${day}, ${when.time}`} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} />
      </View>
    </Tap>
  );
}
