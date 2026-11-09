import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { listMetalRates, setMetalRate, type Metal, type MetalRate } from '@/extras/api';
import { METALS, purities, validateRate } from '@/extras/logic';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { showToast } from '@/ui/toast';

/** Today's price of one gram of gold, silver and platinum. Setting a rate re-prices the jewellery. Reading needs `product.view`; setting `product.update`. */
export default function MetalRatesScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('product.view');
  const canSet = perms.includes('product.update');
  const list = useQuery({ queryKey: ['metal-rates'], queryFn: listMetalRates, enabled: allowed });
  const [open, setOpen] = useState(false);
  const [metal, setMetal] = useState<Metal>('Gold');
  const [purity, setPurity] = useState('22K');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => setMetalRate({ metal, purity, rate_per_gram: rate.trim() }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['metal-rates'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      showToast({ text: t('Rate saved. {n} items re-priced.', { n: r.repriced }) });
      setOpen(false);
    },
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : 'Could not save the rate. Try again.'),
  });
  function submit() {
    const e = validateRate({ metal, purity, rate });
    setError(e.purity ?? e.rate ?? null);
    if (!e.purity && !e.rate) save.mutate();
  }
  const chip = (label: string, on: boolean, press: () => void) => (
    <Tap key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={press} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }} literal>
        {label}
      </ThemedText>
    </Tap>
  );

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see metal rates. Ask the owner.</Notice>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Metal Rates'), headerRight: canSet ? () => <HeaderAction title="Set" icon="Pencil" onPress={() => { setRate(''); setError(null); setOpen(true); }} /> : undefined }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={list.data ?? []}
        keyExtractor={(r: MetalRate) => `${r.metal}-${r.purity}`}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="bodyMedium" literal>
                {`${t(item.metal)} ${item.purity}`}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {item.effective_at.slice(0, 10)}
              </ThemedText>
            </View>
            <ThemedText type="bodyMedium" literal>
              {`${formatBDT(item.rate_per_gram, { dp: 0 })} / ${t('gram')}`}
            </ThemedText>
          </View>
        )}
        ListHeaderComponent={list.isError ? <ErrorState message={t('Could not load the metal rates.')} onRetry={() => void list.refetch()} /> : undefined}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Cash" title="No rates set" hint="Set today's price for one gram." />}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Set a metal rate">
        <View style={{ gap: Spacing.three }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>{METALS.map((m) => chip(t(m.label), metal === m.key, () => { setMetal(m.key); setPurity(purities(m.key)[0]); }))}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>{purities(metal).map((p) => chip(p, purity === p, () => setPurity(p)))}</View>
          <Field label="Price of one gram" required prefix="৳" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
          {error ? <Notice>{error}</Notice> : null}
          <Button title="Save the rate" variant="success" size="lg" loading={save.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </View>
  );
}
