import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, ScrollView, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Step } from '@/components/quantity-step';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { useDebounced } from '@/lib/use-debounced';
import { formatQuantity } from '@/stock/status';
import { createTransfer, dispatchTransfer, listPlaces, listShelf, listTransfers } from '@/transfers/api';
import { addLine, describeNewTransferError, destinations, matchCreated, origins, problem, removeLine, setQuantity, stepQuantity, transferBody, type DraftLine, type Place, type Sendable } from '@/transfers/draft';
import { ASK } from '@/transfers/logic';
import { showToast } from '@/ui/toast';

/** Make a transfer: where the goods leave from, where they go, what and how many. Save it for later, or send it now. Nothing moves until it is sent. */
export default function NewTransferScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const allowed = perms.includes('inventory.transfer');
  const places = useQuery({ queryKey: ['places'], queryFn: listPlaces, enabled: allowed && perms.includes('warehouse.view') });
  const mine = origins(places.data ?? [], me?.active_branch?.id);
  const [fromPick, setFromPick] = useState<string | null>(null);
  const [toPick, setToPick] = useState<string | null>(null);
  const from = fromPick ?? mine.find((p) => p.type === 'MAIN')?.id ?? mine[0]?.id;
  const goes = destinations(places.data ?? [], from);
  const to = toPick && goes.some((p) => p.id === toPick) ? toPick : undefined;
  const [sheet, setSheet] = useState<'from' | 'to' | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [note, setNote] = useState('');
  const [shown, setShown] = useState<string | null>(null);
  const shelf = useQuery({ queryKey: ['shelf', from, q], queryFn: () => listShelf({ warehouse: from!, search: q }), enabled: allowed && !!from && perms.includes('inventory.view') });
  const picks: Sendable[] = (shelf.data ?? [])
    .filter((r) => Number(r.available) > 0 && !lines.some((l) => l.variant === r.variant))
    .slice(0, 8)
    .map((r) => ({ variant: r.variant, name: r.variant_name && r.variant_name.toLowerCase() !== 'default' ? `${r.product_name} ${r.variant_name}` : r.product_name, sku: r.sku, available: r.available, unit: r.unit_short_name ?? '', allowDecimal: r.unit_allow_decimal === true }));
  const nameOf = (id?: string | null) => (places.data ?? []).find((p) => p.id === id)?.name ?? '';

  const save = useMutation({
    mutationFn: async (send: boolean) => {
      const body = transferBody({ from: from!, to: to!, lines, note });
      const startedAt = new Date().toISOString();
      let made;
      try {
        made = await createTransfer(body);
      } catch (e) {
        // No Idempotency-Key on this call: after a lost connection the list says whether the draft was made.
        if (!(e instanceof ApiError) || (e.code !== 'NETWORK_ERROR' && e.code !== 'TIMEOUT')) throw e;
        made = matchCreated(await listTransfers(), body, startedAt);
        if (!made) throw e;
      }
      if (!send) return { id: made.id, sent: false, failed: null as unknown };
      try {
        await dispatchTransfer(made.id);
        return { id: made.id, sent: true, failed: null as unknown };
      } catch (e) {
        return { id: made.id, sent: false, failed: e };
      }
    },
    onSuccess: (r) => {
      haptics.success();
      for (const k of ['transfers', 'transfers-totals', 'stock', 'movements', 'movements-totals', 'shelf']) void queryClient.invalidateQueries({ queryKey: [k] });
      showToast({ text: r.failed ? t('Saved, but it was not sent. Open it to send.') : r.sent ? t('Sent') : t('Saved') });
      router.replace({ pathname: '/transfer/[id]', params: { id: r.id } });
    },
    onError: () => haptics.warning(),
  });

  if (!allowed || !perms.includes('warehouse.view') || !perms.includes('inventory.view')) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to make a transfer. Ask the owner.</Notice>
      </View>
    );
  }

  const stop = problem({ from, to, lines });
  function submit(send: boolean) {
    Keyboard.dismiss();
    const p = problem({ from, to, lines });
    setShown(p);
    if (p) return;
    if (!send) return save.mutate(false);
    const a = ASK.dispatch;
    Alert.alert(t(a.title), t(a.body, { from: nameOf(from), to: nameOf(to) }), [{ text: t('Not now'), style: 'cancel' }, { text: t(a.button), onPress: () => save.mutate(true) }]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('New transfer') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.five, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {places.isError ? <ErrorState message={t('Could not load your places.')} onRetry={() => void places.refetch()} /> : null}
        {places.isPending ? <SkeletonRows /> : null}
        {places.data && goes.length === 0 ? <Notice kind="info">There is no other open place to send goods to. Add a branch or a shelf on the computer first.</Notice> : null}

        {places.data ? (
          <View style={{ gap: Spacing.two }}>
            <PlaceRow label="From" value={nameOf(from)} onPress={mine.length > 1 ? () => setSheet('from') : undefined} />
            <View style={{ alignItems: 'center' }}>
              <Icon name="ArrowRight" size={18} color={theme.textMuted} />
            </View>
            <PlaceRow label="To" value={nameOf(to)} placeholder="Choose where to send" onPress={goes.length ? () => setSheet('to') : undefined} />
          </View>
        ) : null}

        {from ? (
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="smallMedium">What to send</ThemedText>
            {lines.map((l) => (
              <LineCard key={l.variant} l={l} onStep={(d) => setLines((x) => stepQuantity(x, l.variant, d))} onType={(v) => setLines((x) => setQuantity(x, l.variant, v))} onRemove={() => setLines((x) => removeLine(x, l.variant))} />
            ))}
            <Field label="Find an item to add" value={search} onChangeText={setSearch} placeholder="Item name or code" autoCapitalize="none" autoCorrect={false} />
            {shelf.isError ? <ErrorState message={t('Could not load the items.')} onRetry={() => void shelf.refetch()} /> : null}
            {shelf.isPending ? <SkeletonRows /> : null}
            {picks.map((p) => (
              <Tap key={p.variant} accessibilityRole="button" accessibilityLabel={t('Add {name}', { name: p.name })} onPress={() => { setLines((x) => addLine(x, p)); setShown(null); haptics.tap(); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="bodyMedium" numberOfLines={2} literal>
                    {p.name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" literal>
                    {t('{n} on the shelf', { n: `${formatQuantity(p.available, p.allowDecimal)}${p.unit ? ` ${p.unit}` : ''}` })}
                  </ThemedText>
                </View>
                <Icon name="Plus" size={20} color={theme.brandText} />
              </Tap>
            ))}
            {shelf.data && picks.length === 0 && !shelf.isPending ? (
              <ThemedText type="small" themeColor="textMuted">
                {q ? 'Nothing on this shelf matches that.' : lines.length ? 'That is everything on this shelf.' : 'There is nothing on this shelf to send.'}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="For example: van 2, for the Mirpur shop" />

        {shown ? <Notice>{t(shown)}</Notice> : null}
        {save.error ? <Notice>{t(describeNewTransferError(save.error))}</Notice> : null}
        <View style={{ gap: Spacing.two }}>
          <Button title="Send now" size="lg" variant="success" loading={save.isPending && save.variables === true} disabled={save.isPending || !!stop} onPress={() => submit(true)} />
          <Button title="Save for later" variant="secondary" loading={save.isPending && save.variables === false} disabled={save.isPending || !!stop} onPress={() => submit(false)} />
        </View>
      </ScrollView>

      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'from' ? 'Where do the goods leave from?' : 'Where are they going?'}>
        <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.three }}>
          {(sheet === 'from' ? mine : goes).map((p: Place) => {
            const on = (sheet === 'from' ? from : to) === p.id;
            return (
              <Tap key={p.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { if (sheet === 'from') { setFromPick(p.id); setLines([]); } else setToPick(p.id); setSheet(null); setShown(null); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 2, borderColor: on ? theme.go : theme.inputBorder, backgroundColor: on ? theme.successSoft : theme.card }}>
                <Icon name={on ? 'Check' : 'Package'} size={20} color={on ? theme.success : theme.textSecondary} />
                <ThemedText type="bodyMedium" literal style={{ flex: 1 }}>
                  {p.name}
                </ThemedText>
              </Tap>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

function PlaceRow({ label, value, placeholder, onPress }: { label: string; value: string; placeholder?: string; onPress?: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${t(label)}: ${value || t(placeholder ?? '')}`} disabled={!onPress} onPress={onPress} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: value ? theme.border : theme.warning }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="caption" themeColor="textMuted">
          {label}
        </ThemedText>
        {value ? (
          <ThemedText type="bodyMedium" literal numberOfLines={1}>
            {value}
          </ThemedText>
        ) : (
          <ThemedText type="bodyMedium" themeColor="textMuted">
            {placeholder ?? ''}
          </ThemedText>
        )}
      </View>
      {onPress ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
    </Tap>
  );
}

function LineCard({ l, onStep, onType, onRemove }: { l: DraftLine; onStep: (d: 1 | -1) => void; onType: (v: string) => void; onRemove: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="bodyMedium" numberOfLines={2} literal>
            {l.name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {t('{n} on the shelf', { n: `${formatQuantity(l.available, l.allowDecimal)}${l.unit ? ` ${l.unit}` : ''}` })}
          </ThemedText>
        </View>
        <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: l.name })} onPress={onRemove} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="X" size={18} color={theme.textSecondary} />
        </Tap>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <Step icon="Minus" label={t('Fewer {name}', { name: l.name })} disabled={Number(l.quantity || 0) <= 0} onPress={() => onStep(-1)} />
        <View style={{ flex: 1 }}>
          <Field label="Amount to send" value={l.quantity} onChangeText={onType} keyboardType={l.allowDecimal ? 'decimal-pad' : 'number-pad'} />
        </View>
        <Step icon="Plus" label={t('More {name}', { name: l.name })} disabled={Number(l.quantity || 0) >= Number(l.available)} onPress={() => onStep(1)} />
      </View>
    </View>
  );
}
