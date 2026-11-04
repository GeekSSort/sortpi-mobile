import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { profitNote } from '@/catalog/new-product';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ToneTile } from '@/components/tone-tile';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { VariantCard, useLevelStyle } from '@/products/variant-card';
import { clearOffer, getProduct, listOffers, setOffer, setPrice, type Product, type Variant } from '@/products/api';
import { describeProductError, offerBody, offerProblem, priceAfterOffer, priceBody, priceProblem, shopOfferFor, type EndChoice, type Offer, type OfferMode } from '@/products/logic';
import { formatQuantity, stockLevel } from '@/stock/status';
import { showToast } from '@/ui/toast';

const hideDefault = (name: string) => (name.trim().toLowerCase() === 'default' ? '' : name);

/** One item: what it is, and for each kind its price, barcode, stock and offer. People who may edit can change the price, run an offer, or edit the details. */
export default function ProductScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useQuery({ queryKey: ['products', 'one', id], queryFn: () => getProduct(id), enabled: !!id });
  const offers = useQuery({ queryKey: ['products', 'offers'], queryFn: listOffers, staleTime: 30_000 });
  const canEdit = me?.permissions?.includes('product.update') ?? false;
  const [priceFor, setPriceFor] = useState<Variant | null>(null);
  const [offerFor, setOfferFor] = useState<Variant | null>(null);
  const p = product.data;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={product.isRefetching} onRefresh={() => void Promise.all([product.refetch(), offers.refetch()])} />} style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Item'), headerRight: canEdit && p?.is_active ? () => <HeaderAction title="Edit" icon="Pencil" onPress={() => router.push({ pathname: '/edit-product/[id]', params: { id: p.id } })} /> : undefined }} />
      {product.isPending ? <SkeletonRows count={3} /> : null}
      {product.isError ? <ErrorState message={t('Could not load this item.')} onRetry={() => void product.refetch()} /> : null}
      {p ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="heading" literal>
              {p.name}
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
              {[p.category_name, p.brand_name, p.unit_name].filter(Boolean).map((x) => (
                <View key={x} style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: Radius.full, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <ThemedText type="caption" themeColor="textSecondary" literal>
                    {x}
                  </ThemedText>
                </View>
              ))}
            </View>
            {!p.is_active ? <Notice kind="info">This item is archived.</Notice> : null}
          </View>

          <Summary product={p} offers={offers.data ?? []} />

          {p.variants.map((v) => (
            <VariantCard key={v.id} product={p} variant={v} offer={shopOfferFor(offers.data ?? [], v.id)} canEdit={canEdit && p.is_active} onPrice={() => setPriceFor(v)} onOffer={() => setOfferFor(v)} />
          ))}
        </>
      ) : null}

      {p && priceFor ? <PriceSheet product={p} variant={priceFor} onClose={() => setPriceFor(null)} /> : null}
      {p && offerFor ? <OfferSheet product={p} variant={offerFor} offer={shopOfferFor(offers.data ?? [], offerFor.id)} onClose={() => setOfferFor(null)} /> : null}
    </ScrollView>
  );
}

/** Two big figures at the top: how much is on the shelf (green, orange or red, with its picture) and what it sells for (green money). */
function Summary({ product: p, offers }: { product: Product; offers: Offer[] }) {
  const { t } = usePrefs();
  const levelStyle = useLevelStyle();
  const level = stockLevel(p.stock_on_hand, p.reorder_level);
  const st = levelStyle(level);
  const prices = p.variants.map((v) => Number(v.price));
  const from = prices.length ? Math.min(...prices) : 0;
  const several = new Set(prices).size > 1;
  const onOffer = p.variants.some((v) => shopOfferFor(offers, v.id));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
      <ToneTile label="On the shelf" icon={st.icon} tone={level === 'in' ? 'good' : level === 'low' ? 'warn' : 'bad'} value={formatQuantity(p.stock_on_hand, p.unit_allow_decimal)} note={st.word} />
      <ToneTile label="Sells for" icon="Cash" tone="good" value={several ? t('from {amount}', { amount: formatBDT(String(from), { dp: 0 }) }) : formatBDT(String(from), { dp: 0 })} note={onOffer ? t('An offer is running') : p.variants.length > 1 ? t('{n} kinds', { n: p.variants.length }) : undefined} />
    </View>
  );
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const k of ['products', 'stock', 'catalog', 'sell']) void queryClient.invalidateQueries({ queryKey: [k] });
  };
}

function PriceSheet({ product, variant, onClose }: { product: Product; variant: Variant; onClose: () => void }) {
  const { t } = usePrefs();
  const refresh = useRefresh();
  const [text, setText] = useState(Number(variant.price).toFixed(2));
  const [problem, setProblem] = useState<string | null>(null);
  const label = hideDefault(variant.name) ? `${product.name} · ${variant.name}` : product.name;
  const note = variant.cost_price !== undefined ? profitNote(variant.cost_price, text.trim()) : null;
  const save = useMutation({
    mutationFn: () => setPrice(product.id, priceBody(text, variant.id)),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Price changed') });
      refresh();
      onClose();
    },
    onError: () => haptics.warning(),
  });
  function submit() {
    const msg = priceProblem(text);
    setProblem(msg);
    if (!msg) save.mutate();
  }
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title="Change price">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary" literal>
          {t('{name} sells for {amount} now.', { name: label, amount: formatBDT(variant.price) })}
        </ThemedText>
        <Field label="New selling price" prefix="৳" value={text} onChangeText={(v) => { setText(v); setProblem(null); save.reset(); }} keyboardType="decimal-pad" error={problem ? t(problem) : undefined} autoFocus selectTextOnFocus />
        {note ? (
          <ThemedText type="small" themeColor={note.loss ? undefined : 'textSecondary'} literal>
            {note.loss ? t('That is below what you paid. You lose {amount} on each.', { amount: formatBDT(note.profit.replace('-', '')) }) : t('You keep {amount} on each ({percent}%).', { amount: formatBDT(note.profit), percent: note.percent })}
          </ThemedText>
        ) : null}
        {save.isError ? <Notice>{describeProductError(save.error)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save price" variant="success" loading={save.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}

const ENDS: { id: EndChoice; label: string }[] = [
  { id: 'none', label: 'No end day' },
  { id: 'week', label: 'For a week' },
  { id: 'month', label: 'For a month' },
];

function OfferSheet({ product, variant, offer, onClose }: { product: Product; variant: Variant; offer: Offer | undefined; onClose: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const refresh = useRefresh();
  const [mode, setMode] = useState<OfferMode>(offer?.mode ?? 'PERCENT');
  const [value, setValue] = useState(offer ? String(Number(offer.value)) : '');
  const [end, setEnd] = useState<EndChoice>('none');
  const [problem, setProblem] = useState<string | null>(null);
  const label = hideDefault(variant.name) ? `${product.name} · ${variant.name}` : product.name;
  const done = (text: string) => {
    haptics.success();
    showToast({ text });
    refresh();
    onClose();
  };
  const save = useMutation({ mutationFn: () => setOffer(product.id, offerBody({ mode, value, variant: variant.id, endChoice: end, today: localDateISO() })), onSuccess: () => done(t('Offer saved')), onError: () => haptics.warning() });
  const remove = useMutation({ mutationFn: () => clearOffer(product.id, variant.id), onSuccess: () => done(t('Offer removed')), onError: () => haptics.warning() });
  const busy = save.isPending || remove.isPending;
  const msg = value.trim() ? offerProblem(mode, value, variant.price) : null;
  const preview = !offerProblem(mode, value, variant.price) ? priceAfterOffer(variant.price, { mode, value: value.trim() }) : null;
  function submit() {
    const m = offerProblem(mode, value, variant.price);
    setProblem(m);
    if (!m) save.mutate();
  }
  const chip = (on: boolean) => ({ minHeight: 48, justifyContent: 'center' as const, paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.canvas, borderWidth: 1, borderColor: on ? theme.brandSoftBorder : theme.border });
  return (
    <BottomSheet visible onClose={() => !busy && onClose()} title={offer ? 'Change the offer' : 'Run an offer'}>
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary" literal>
          {t('{name} sells for {amount} now.', { name: label, amount: formatBDT(variant.price) })}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {(['PERCENT', 'FLAT'] as const).map((m) => (
            <Tap key={m} accessibilityRole="button" accessibilityState={{ selected: mode === m }} onPress={() => { setMode(m); setProblem(null); save.reset(); }} style={chip(mode === m)}>
              <ThemedText type="smallMedium" style={{ color: mode === m ? theme.brandText : theme.textSecondary }}>
                {m === 'PERCENT' ? 'Percent off' : 'Taka off'}
              </ThemedText>
            </Tap>
          ))}
        </View>
        <Field label={mode === 'PERCENT' ? 'Percent off' : 'Taka off'} prefix={mode === 'PERCENT' ? '%' : '৳'} value={value} onChangeText={(v) => { setValue(v); setProblem(null); save.reset(); }} keyboardType="decimal-pad" error={problem ? t(problem) : msg ? t(msg) : undefined} autoFocus />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {ENDS.map((e) => (
            <Tap key={e.id} accessibilityRole="button" accessibilityState={{ selected: end === e.id }} onPress={() => setEnd(e.id)} style={chip(end === e.id)}>
              <ThemedText type="smallMedium" style={{ color: end === e.id ? theme.brandText : theme.textSecondary }}>
                {e.label}
              </ThemedText>
            </Tap>
          ))}
        </View>
        {preview ? (
          <ThemedText type="bodyMedium" style={{ color: theme.success }} literal>
            {t('Customers pay {amount}', { amount: formatBDT(preview) })}
          </ThemedText>
        ) : null}
        {save.isError ? <Notice>{describeProductError(save.error)}</Notice> : null}
        {remove.isError ? <Notice>{describeProductError(remove.error)}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={busy} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save offer" variant="success" loading={save.isPending} disabled={remove.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
        {offer ? <Button title="Stop the offer" variant="secondary" loading={remove.isPending} disabled={save.isPending} onPress={() => remove.mutate()} /> : null}
      </View>
    </BottomSheet>
  );
}
