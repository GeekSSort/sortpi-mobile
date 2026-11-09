import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { ApiError } from '@/api/client';
import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
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
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { formatBDT } from '@/lib/money';
import { findGiftCard, listGiftCards, payOutGiftCard, sellGiftCard, voidGiftCard, type GiftCard, type Method } from '@/trade/api';
import { cardLook, validateCard } from '@/trade/logic';
import { showToast } from '@/ui/toast';

const METHODS: Method[] = ['CASH', 'CARD', 'BANK', 'MOBILE'];

/** Gift cards: sell one, look one up by its code, pay out what is left, or void it. Needs `sale.view`; selling `sale.create`; paying out `sale.refund`; voiding `sale.cancel`. */
export default function GiftCardsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const qc = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('sale.view');
  const today = localDateISO(new Date());
  const list = useInfiniteQuery({ queryKey: ['gift-cards'], queryFn: ({ pageParam }) => listGiftCards(pageParam), initialPageParam: 1, getNextPageParam: (l) => l.nextPage, enabled: allowed });
  const [code, setCode] = useState('');
  const [found, setFound] = useState<GiftCard | null>(null);
  const [looked, setLooked] = useState(false);
  const rows = found ? [found] : (list.data?.pages.flatMap((p) => p.rows) ?? []);
  const [picked, setPicked] = useState<GiftCard | null>(null);
  const [selling, setSelling] = useState(false);
  const [value, setValue] = useState('');
  const [method, setMethod] = useState<Method>('CASH');
  const [newCode, setNewCode] = useState('');
  const [expires, setExpires] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const refresh = () => void qc.invalidateQueries({ queryKey: ['gift-cards'] });
  const fail = (e: unknown) => setError(e instanceof ApiError && e.message ? e.message : 'Could not save. Try again.');

  const sell = useMutation({
    mutationFn: () => sellGiftCard({ value: value.trim(), payment_method: method, ...(newCode.trim() ? { code: newCode.trim().toUpperCase() } : {}), ...(expires.trim() ? { expires_on: expires.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) }, key.current),
    onSuccess: (c) => { refresh(); showToast({ text: t('Gift card {code} sold.', { code: c.code }) }); setSelling(false); setValue(''); setNewCode(''); setExpires(''); setNote(''); key.current = newIdempotencyKey(); },
    onError: fail,
  });
  const payOut = useMutation({ mutationFn: (c: GiftCard) => payOutGiftCard(c.id, { payment_method: 'CASH' }), onSuccess: () => { refresh(); setFound(null); showToast({ text: t('Paid out.') }); }, onError: (e) => Alert.alert(t('Not paid out'), e instanceof ApiError ? e.message : t('Try again.')) });
  const voidIt = useMutation({ mutationFn: (c: GiftCard) => voidGiftCard(c.id), onSuccess: () => { refresh(); setFound(null); showToast({ text: t('Gift card voided.') }); }, onError: (e) => Alert.alert(t('Not voided'), e instanceof ApiError ? e.message : t('Try again.')) });
  async function look() {
    if (!code.trim()) { setFound(null); setLooked(false); return; }
    setLooked(true);
    setFound(await findGiftCard(code.trim().toUpperCase()).catch(() => null));
  }
  function submit() {
    const e = validateCard({ value, expires });
    setError(e.value ?? e.expires ?? null);
    if (!e.value && !e.expires) sell.mutate();
  }
  const confirm = (title: string, msg: string, go: () => void) => Alert.alert(title, msg, [{ text: t('Keep it'), style: 'cancel' }, { text: t('Yes'), style: 'destructive', onPress: go }]);

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see gift cards. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <Field label="Look up a card by its code" value={code} onChangeText={(v) => { setCode(v); if (!v.trim()) { setFound(null); setLooked(false); } }} autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => void look()} />
      {looked && !found ? <Notice kind="info">No card has that code.</Notice> : null}
      {list.isError ? <ErrorState message={t('Could not load the gift cards.')} onRetry={() => void list.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Gift Cards'), headerRight: perms.includes('sale.create') ? () => <HeaderAction title="Sell" icon="Plus" onPress={() => { setError(null); setSelling(true); }} /> : undefined }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => {
          const look_ = cardLook(item, today);
          const colour = { live: theme.success, used: theme.textMuted, expired: theme.warning, voided: theme.danger }[look_];
          return (
            <Tap accessibilityRole="button" onPress={() => setPicked(item)} style={{ gap: 2, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: colour, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText type="bodyMedium" literal>
                  {item.code}
                </ThemedText>
                <ThemedText type="bodyMedium" literal style={{ color: colour }}>
                  {formatBDT(item.balance, { dp: 0 })}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${t('Sold for')} ${formatBDT(item.initial_value, { dp: 0 })}${item.expires_on ? ` · ${t('until {date}', { date: item.expires_on })}` : ''} · ${t({ live: 'Ready to use', used: 'Used up', expired: 'Expired', voided: 'Voided' }[look_])}`}
              </ThemedText>
            </Tap>
          );
        }}
        ListHeaderComponent={header}
        ListEmptyComponent={list.isPending ? <SkeletonRows /> : list.isError ? undefined : <EmptyState icon="Gift" title="No gift cards yet" hint="Sell a card and it shows here." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : undefined}
        onEndReached={() => !found && list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
      <ActionSheet
        title={picked?.code ?? null}
        actions={[
          ...(picked && cardLook(picked, today) !== 'voided' && Number(picked.balance) > 0 && perms.includes('sale.refund') ? [{ title: t('Pay out {amount}', { amount: formatBDT(picked.balance, { dp: 0 }) }), icon: 'Cash' as const, onPress: () => { const c = picked; setPicked(null); confirm(t('Pay out the balance?'), t('{amount} in cash goes back to the customer.', { amount: formatBDT(c.balance, { dp: 0 }) }), () => payOut.mutate(c)); } }] : []),
          ...(picked && picked.is_active && perms.includes('sale.cancel') ? [{ title: t('Void this card'), icon: 'Cancel' as const, onPress: () => { const c = picked; setPicked(null); confirm(t('Void this gift card?'), t('It can no longer be used.'), () => voidIt.mutate(c)); } }] : []),
        ]}
        onClose={() => setPicked(null)}
      />
      <BottomSheet visible={selling} onClose={() => setSelling(false)} title="Sell a gift card">
        <View style={{ gap: Spacing.three }}>
          <Field label="Amount on the card" required prefix="৳" value={value} onChangeText={(v) => { setValue(v); key.current = newIdempotencyKey(); }} keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
            {METHODS.map((m) => {
              const on = method === m;
              return (
                <Tap key={m} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setMethod(m); key.current = newIdempotencyKey(); }} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
                  <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                    {t({ CASH: 'Cash', CARD: 'Card', BANK: 'Bank', MOBILE: 'Mobile' }[m])}
                  </ThemedText>
                </Tap>
              );
            })}
          </View>
          <Field label="Card code (optional)" value={newCode} onChangeText={setNewCode} autoCapitalize="characters" autoCorrect={false} hint="Leave empty and the shop makes one." />
          <Field label="Last day (optional)" value={expires} onChangeText={setExpires} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
          <Field label="Note (optional)" value={note} onChangeText={setNote} />
          {error ? <Notice>{error}</Notice> : null}
          <Button title="Sell the card" variant="success" size="lg" loading={sell.isPending} onPress={submit} />
        </View>
      </BottomSheet>
    </View>
  );
}
