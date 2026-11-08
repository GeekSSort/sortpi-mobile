import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { listRefills, markTold, type Refill } from '@/groups/api';
import { refillLook, whatsappLink } from '@/groups/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

const WINDOWS = [
  { id: 'week', label: 'Next 7 days', within: 7, overdue: 30 },
  { id: 'month', label: 'Next 30 days', within: 30, overdue: 30 },
] as const;

/** Customers who are about to run out of something they bought, soonest first: call or message them. Only shops whose trade has refills (pharmacy, health). */
export default function RefillsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('customer.view');
  const canTell = perms.includes('customer.update');
  const [win, setWin] = useState<(typeof WINDOWS)[number]>(WINDOWS[0]);
  const list = useQuery({ queryKey: ['refills', win.id], queryFn: () => listRefills(win.within, win.overdue), enabled: allowed });
  const told = useMutation({ mutationFn: (r: Refill) => markTold(r), onSuccess: () => { void qc.invalidateQueries({ queryKey: ['refills'] }); showToast({ text: t('Marked as told.') }); }, onError: () => showToast({ text: t('Could not save. Try again.') }) });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see refills. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {WINDOWS.map((w) => {
          const on = w.id === win.id;
          return (
            <Tap key={w.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setWin(w)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {t(w.label)}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
      {list.isError ? <ErrorState message={t('Could not load the refills.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Refills') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(r) => `${r.customer_id}-${r.variant_id}-${r.due_on}`}
        renderItem={({ item }) => <Row r={item} canTell={canTell} busy={told.isPending && told.variables === item} onTold={() => told.mutate(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="CheckCircle" title="Nobody is running out" hint="Customers who need a refill soon show here." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

function Row({ r, canTell, busy, onTold }: { r: Refill; canTell: boolean; busy: boolean; onTold: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const look = refillLook(r);
  const bar = { late: theme.danger, today: theme.warning, soon: theme.success, told: theme.border }[look];
  const when = look === 'late' ? t('{n} days late', { n: Math.abs(r.days_left) }) : look === 'today' ? t('Due today') : look === 'told' ? t('Told') : t('In {n} days', { n: r.days_left });
  const item = `${r.product_name}${r.variant_name && r.variant_name !== r.product_name ? ` ${r.variant_name}` : ''}`;
  const wa = whatsappLink(r.whatsapp || r.phone, t('Hello {name}, your {item} is about to run out. Would you like a refill?', { name: r.customer_name, item }));
  return (
    <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: bar, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
        <ThemedText type="bodyMedium" style={{ flex: 1 }} numberOfLines={1} literal>
          {r.customer_name}
        </ThemedText>
        <ThemedText type="smallMedium" literal style={{ color: bar }}>
          {when}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} literal>
        {`${item} · ${r.due_on}`}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {r.phone ? <Button title="Call" variant="secondary" onPress={() => void Linking.openURL(`tel:${r.phone}`)} style={{ flex: 1 }} /> : null}
        {wa ? <Button title="WhatsApp" variant="secondary" onPress={() => void Linking.openURL(wa)} style={{ flex: 1 }} /> : null}
        {canTell && look !== 'told' ? <Button title="Told" variant="success" loading={busy} onPress={onTold} style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}
