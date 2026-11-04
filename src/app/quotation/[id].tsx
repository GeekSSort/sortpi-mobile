import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, RefreshControl, ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { compareMoney, formatBDT } from '@/lib/money';
import { cancelQuote, getQuote, sendQuoteToTill } from '@/orders/api';
import { useOrderLook } from '@/orders/look';
import { describeOrderError, quoteSteps } from '@/orders/logic';
import { Pill } from '@/products/variant-card';
import { showToast } from '@/ui/toast';

const money = (v: string) => formatBDT(v);

/** One quotation: the price promised, who it is for, until when, and the next step (send it to the till, or cancel it). */
export default function QuotationScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const quote = useQuery({ queryKey: ['quotes', 'one', id], queryFn: () => getQuote(id), enabled: !!id });
  const q = quote.data;
  const steps = q ? quoteSteps(q, me?.permissions) : null;
  const look = useOrderLook().quote(q ?? { status: 'OPEN', expired: false });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['quotes'] });
    void queryClient.invalidateQueries({ queryKey: ['held'] });
  };
  const send = useMutation({
    mutationFn: () => sendQuoteToTill(id),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('It is on the till. Open the Sell tab and tap the held carts.') });
      refresh();
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeOrderError(e)) });
      refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: () => cancelQuote(id),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Quotation cancelled') });
      refresh();
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeOrderError(e)) });
      refresh();
    },
  });
  const askCancel = () => Alert.alert(t('Cancel this quotation?'), t('The customer will not be able to use this price.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, cancel it'), style: 'destructive', onPress: () => cancel.mutate() }]);
  const [, m, d] = (q?.valid_until ?? '2000-01-01').split('-').map(Number);
  const card = { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous' as const, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={quote.isRefetching} onRefresh={() => void quote.refetch()} />} style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Quotation') }} />
      {quote.isPending ? <SkeletonRows count={3} /> : null}
      {quote.isError ? <ErrorState message={t('Could not load this quotation.')} onRetry={() => void quote.refetch()} /> : null}
      {q ? (
        <>
          <View style={{ gap: Spacing.two }}>
            <ThemedText type="heading" literal>
              {q.customer_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted" selectable literal>
              {q.reference_no}
              {q.customer_phone ? ` · ${q.customer_phone}` : ''}
            </ThemedText>
            <Pill icon={look.icon} text={look.word} fg={look.fg} soft={look.soft} line={look.line} />
            {q.customer_phone ? (
              <Tap accessibilityRole="button" accessibilityLabel={t('Call {phone}', { phone: q.customer_phone })} onPress={() => void Linking.openURL(`tel:${q.customer_phone}`)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: theme.brandSoftBorder, backgroundColor: theme.brandSoft }}>
                <Icon name="Phone" size={20} color={theme.brandText} />
                <ThemedText type="smallMedium" style={{ color: theme.brandText }} literal>
                  {t('Call {phone}', { phone: q.customer_phone })}
                </ThemedText>
              </Tap>
            ) : null}
          </View>

          <ToneTile label="The price" icon="Cash" tone="good" value={money(q.grand_total)} note={compareMoney(q.tax_amount, '0') > 0 ? t('includes tax {amount}', { amount: money(q.tax_amount) }) : undefined} />

          <View style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
            <Icon name={q.expired ? 'TriangleAlert' : 'Package'} size={22} color={q.expired ? theme.danger : theme.brandText} />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" themeColor="textMuted">
                This price is good until
              </ThemedText>
              <ThemedText type="bodyMedium" style={q.expired ? { color: theme.danger } : undefined} literal>
                {`${d} ${MONTHS[lang][m - 1]}`}
              </ThemedText>
            </View>
          </View>

          <View style={card}>
            <ThemedText type="bodyMedium">Items</ThemedText>
            {q.items.map((it, i) => (
              <View key={it.id} style={{ flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallMedium" literal>
                    {it.product_name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" literal>
                    {`${Number(it.quantity)} × ${money(it.unit_price)}`}
                  </ThemedText>
                </View>
                <ThemedText type="smallMedium" literal>
                  {money(it.line_total)}
                </ThemedText>
              </View>
            ))}
          </View>
          {q.note ? (
            <ThemedText type="small" themeColor="textSecondary" literal>
              {q.note}
            </ThemedText>
          ) : null}
          {q.status === 'SENT' ? <Notice kind="info">This quotation is on the till. Open the Sell tab and tap the held carts to sell it.</Notice> : null}
          {q.expired ? <Notice>This quotation is past its last day, so it cannot be sent to the till.</Notice> : null}

          {steps?.send ? <Button title="Send it to the till" variant="success" size="lg" loading={send.isPending} disabled={cancel.isPending} onPress={() => send.mutate()} /> : null}
          {steps?.cancel ? <Button title="Cancel this quotation" variant="secondary" loading={cancel.isPending} disabled={send.isPending} onPress={askCancel} /> : null}
          {q.status === 'SENT' ? <Button title="Go to the Sell tab" onPress={() => router.navigate('/sell')} /> : null}
        </>
      ) : null}
    </ScrollView>
  );
}
