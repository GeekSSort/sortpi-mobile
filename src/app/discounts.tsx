import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AdaptiveList } from '@/components/adaptive-list';
import { useSession } from '@/auth/session-provider';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { discountSummary, listOffers, type OfferRow } from '@/groups/api';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { listProducts } from '@/products/api';

/** The offers running now: which item, how much off and until when. Tap one to open the item and change or end the offer there. Needs `product.view`. */
export default function DiscountsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const { me } = useSession();
  const allowed = me?.permissions?.includes('product.view') ?? false;
  const offers = useQuery({ queryKey: ['offers', 'list'], queryFn: listOffers, enabled: allowed });
  const sum = useQuery({ queryKey: ['offers', 'summary'], queryFn: discountSummary, enabled: allowed });

  async function open(o: OfferRow) {
    const found = await listProducts({ search: o.sku, page: 1 }).catch(() => null);
    const id = found?.rows[0]?.id;
    if (id) router.push({ pathname: '/product/[id]', params: { id } });
  }
  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see offers. Ask the owner.</Notice>
      </View>
    );
  }
  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      {sum.data ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <ToneTile label="Offers running" icon="Percent" value={String(sum.data.active_offers)} />
          <ToneTile label="Items on offer" icon="Tag" value={String(sum.data.products_on_offer)} />
        </View>
      ) : null}
      {offers.isError ? <ErrorState message={t('Could not load the offers.')} onRetry={() => void offers.refetch()} /> : null}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Discount') }} />
      <AdaptiveList
        contentInsetAdjustmentBehavior="automatic"
        data={(offers.data ?? []).filter((o) => o.is_active)}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <Tap accessibilityRole="button" onPress={() => void open(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="bodyMedium" numberOfLines={1} literal>
                {item.product_name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {`${item.sku}${item.ends_on ? ` · ${t('until {date}', { date: item.ends_on })}` : ''}`}
              </ThemedText>
            </View>
            <ThemedText type="bodyMedium" style={{ color: theme.success }} literal>
              {item.mode === 'PERCENT' ? `${Number(item.value)}% ${t('off')}` : `${formatBDT(item.value, { dp: 0 })} ${t('off')}`}
            </ThemedText>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </Tap>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={offers.isPending ? <SkeletonRows /> : offers.isError ? undefined : <EmptyState icon="Percent" title="No offers running" hint="Open an item and set an offer on it." />}
        refreshing={offers.isRefetching}
        onRefresh={() => void Promise.all([offers.refetch(), sum.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
      />
    </View>
  );
}
