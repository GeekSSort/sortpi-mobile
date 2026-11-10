import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

import { negativeStock } from './api';

/** How many lines were sold below zero. Null when there are none, or when this person may not see stock. */
export function useNegativeCount(): number | null {
  const { me } = useSession();
  const can = ['inventory.view', 'product.view'].some((p) => me?.permissions?.includes(p));
  const q = useQuery({ queryKey: ['stock', 'negative'], queryFn: () => negativeStock(1), enabled: can, staleTime: 30_000, retry: false });
  const n = q.data?.count ?? 0;
  return n > 0 ? n : null;
}

/** "Sold below zero, count these": the web's negative-stock strip. Tapping opens Stock on exactly those lines. */
export function NegativeStockNotice({ onShow }: { onShow?: () => void }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const n = useNegativeCount();
  if (n === null) return null;
  const show = onShow ?? (() => router.navigate({ pathname: '/stock', params: { filter: 'negative', n: String(Date.now()) } }));
  return (
    <Tap accessibilityRole="button" accessibilityLabel={t('Show the items sold below zero')} onPress={show} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.dangerBorder, backgroundColor: theme.dangerSoft }}>
      <Icon name="TriangleAlert" size={20} color={theme.danger} />
      <View style={{ flex: 1 }}>
        <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t(n === 1 ? '1 item was sold below zero' : '{n} items were sold below zero', { n })}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{t('Count them to put the stock right.')}</ThemedText>
      </View>
      <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Show')}</ThemedText>
    </Tap>
  );
}
