import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile as Tile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { listVouchers, voidVoucher, voucherTotals, type Voucher } from '@/money/api';
import { canSeeMoney, dayWord, describeMoneyError, permissionFor, type MoneyRange, type MoneyType } from '@/money/logic';
import { showToast } from '@/ui/toast';

const RANGES: { key: MoneyRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
];

/** Money in and money out, one list: pick a period, see what came in, what went out and what is left, add an entry, or cancel one. */
export default function MoneyScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const bigText = useTextFactor() > BIG_TEXT;
  const [range, setRange] = useState<MoneyRange>('month');
  const [side, setSide] = useState<MoneyType | null>(null);
  const [open, setOpen] = useState<Voucher | null>(null);
  const allowed = canSeeMoney(me?.permissions);
  const can = (type: MoneyType, action: 'create' | 'delete') => me?.permissions?.includes(permissionFor(type, action)) ?? false;

  const totals = useQuery({ queryKey: ['money', 'totals', range, side], queryFn: () => voucherTotals(range, side), enabled: allowed, staleTime: 30_000 });
  const list = useInfiniteQuery({
    queryKey: ['money', 'list', range, side],
    queryFn: ({ pageParam }) => listVouchers({ range, type: side, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    enabled: allowed,
  });
  const rows = list.data?.pages.flatMap((p) => p.rows) ?? [];
  const s = totals.data;

  const cancel = useMutation({
    mutationFn: (v: Voucher) => voidVoucher(v.id),
    onSuccess: () => {
      haptics.success();
      setOpen(null);
      showToast({ text: t('Entry cancelled') });
      void queryClient.invalidateQueries({ queryKey: ['money'] });
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeMoneyError(e)) });
    },
  });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>{"You are not allowed to see the shop's money. Ask the owner or manager."}</Notice>
      </View>
    );
  }

  const left = s ? Number(s.net) : 0;
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', flexWrap: bigText ? 'wrap' : 'nowrap', gap: Spacing.two }}>
        <Tile label="Money in" icon="ArrowDownLeft" tone="good" value={s ? formatBDT(s.income, { dp: 0 }) : '…'} selected={side === 'INCOME'} onPress={() => setSide(side === 'INCOME' ? null : 'INCOME')} />
        <Tile label="Money out" icon="ArrowUpRight" tone="bad" value={s ? formatBDT(s.expense, { dp: 0 }) : '…'} selected={side === 'EXPENSE'} onPress={() => setSide(side === 'EXPENSE' ? null : 'EXPENSE')} />
      </View>
      {side === null ? <Tile label="Left over" icon="Cash" tone={s && left < 0 ? 'bad' : s && left > 0 ? 'good' : undefined} value={s ? formatBDT(s.net, { dp: 0 }) : '…'} note={s ? (s.count === 1 ? t('1 entry') : t('{n} entries', { n: s.count })) : undefined} /> : null}
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {can('INCOME', 'create') ? <AddButton type="INCOME" onPress={() => router.push({ pathname: '/add-money', params: { type: 'INCOME' } })} /> : null}
        {can('EXPENSE', 'create') ? <AddButton type="EXPENSE" onPress={() => router.push({ pathname: '/add-money', params: { type: 'EXPENSE' } })} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {RANGES.map((r) => {
          const on = range === r.key;
          return (
            <Tap key={r.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setRange(r.key)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {r.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {list.isError ? <ErrorState message={t('Could not load the entries.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <MoneyRow v={item} lang={lang} onPress={() => setOpen(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : <EmptyState icon="Cash" title="No entries here yet" hint="Write down money that comes in or goes out, like rent, tea or a payment you received." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void Promise.all([list.refetch(), totals.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <BottomSheet visible={!!open} onClose={() => setOpen(null)} title={t('Entry')}>
        {open ? (
          <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
            <View style={{ gap: 6 }}>
              <Fact label="Reason" value={open.category_name} literal />
              <Fact label="Amount" value={`${open.type === 'INCOME' ? '+' : '−'} ${formatBDT(open.amount)}`} color={open.type === 'INCOME' ? theme.success : theme.danger} />
              <Fact label="Kind" value={open.type === 'INCOME' ? t('Money in') : t('Money out')} />
              <Fact label="Date" value={dayText(open.date, lang, t)} />
              {open.description ? <Fact label="Note" value={open.description} literal /> : null}
              <Fact label="Number" value={open.voucher_no} />
              {open.payment_account_name ? <Fact label="Through" value={open.payment_account_name} /> : null}
            </View>
            {can(open.type, 'delete') ? (
              <Button
                title="Cancel this entry"
                variant="secondary"
                loading={cancel.isPending}
                onPress={() => Alert.alert(t('Cancel this entry?'), t('The money is taken back out of your books. This cannot be undone.'), [{ text: t('Keep it'), style: 'cancel' }, { text: t('Yes, cancel it'), style: 'destructive', onPress: () => cancel.mutate(open) }])}
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function dayText(iso: string, lang: 'en' | 'bn', t: (s: string) => string): string {
  const w = dayWord(iso);
  return w === 'today' ? t('Today') : w === 'yesterday' ? t('Yesterday') : `${w.date} ${MONTHS[lang][w.month]}`;
}

function AddButton({ type, onPress }: { type: MoneyType; onPress: () => void }) {
  const theme = useTheme();
  const income = type === 'INCOME';
  const color = income ? theme.go : theme.danger;
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, backgroundColor: color }}>
      <Icon name={income ? 'ArrowDownLeft' : 'ArrowUpRight'} size={20} color={theme.onBrand} />
      <ThemedText type="bodyMedium" style={{ color: theme.onBrand }}>
        {income ? 'Add money in' : 'Add money out'}
      </ThemedText>
    </Tap>
  );
}

function MoneyRow({ v, lang, onPress }: { v: Voucher; lang: 'en' | 'bn'; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const income = v.type === 'INCOME';
  const color = income ? theme.success : theme.danger;
  const amount = formatBDT(v.amount);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${income ? t('Money in') : t('Money out')}, ${v.category_name}, ${amount}, ${dayText(v.date, lang, t)}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: income ? theme.positive : theme.danger, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: income ? theme.successSoft : theme.dangerSoft }}>
        <Icon name={income ? 'ArrowDownLeft' : 'ArrowUpRight'} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {v.category_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {dayText(v.date, lang, t)}
          {v.description ? ` · ${v.description}` : ''}
        </ThemedText>
      </View>
      <ThemedText type="bodyMedium" style={{ color }}>
        {income ? '+' : '−'} {amount}
      </ThemedText>
    </Tap>
  );
}

function Fact({ label, value, color, literal }: { label: string; value: string; color?: string; literal?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallMedium" literal={literal} style={[{ flexShrink: 1, textAlign: 'right' }, color ? { color } : null]}>
        {value}
      </ThemedText>
    </View>
  );
}
