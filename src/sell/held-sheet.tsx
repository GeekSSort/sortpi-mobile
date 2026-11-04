import { Alert, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { useT } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';
import { addMoney, formatBDT, mulMoney } from '@/lib/money';

import type { HeldCart } from './held';

const worth = (h: HeldCart) => h.lines.reduce((sum, l) => addMoney(sum, mulMoney(l.unitPrice, l.quantity)), '0');
const clock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** Carts put aside while the customer fetches something. Taking one back adds it to the cart; the server removes it from the list at the same moment. */
export function HeldSheet({ visible, onClose, carts, failed, busyId, onTake, onDrop, onRetry }: { visible: boolean; onClose: () => void; carts: HeldCart[] | undefined; failed: boolean; busyId: string | null; onTake: (c: HeldCart) => void; onDrop: (c: HeldCart) => void; onRetry: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Carts on hold">
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        {failed ? <ErrorState message={t('Could not load the carts on hold.')} onRetry={onRetry} /> : null}
        {!failed && carts && carts.length === 0 ? <EmptyState icon="Pause" title={t('Nothing on hold')} hint={t('Open the cart and tap “Put on hold” when a customer needs a minute.')} /> : null}
        {(carts ?? []).map((c) => {
          const count = c.lines.reduce((n, l) => n + Number(l.quantity), 0);
          return (
            <View key={c.id} style={{ gap: 8, padding: 12, borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="bodyMedium" numberOfLines={1} literal>{c.customerName || t('Customer: not saved')}</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
                    {[clock(c.at), c.cashierName].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText type="bodyMedium">{formatBDT(worth(c))}</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">{t(count === 1 ? '1 item' : '{n} items', { n: count })}</ThemedText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title="Take it back" variant="success" loading={busyId === c.id} disabled={!!busyId} onPress={() => onTake(c)} style={{ flex: 1 }} />
                <Button
                  title="Throw away"
                  variant="secondary"
                  disabled={!!busyId}
                  onPress={() => Alert.alert(t('Throw this cart away?'), t('It is removed for good. Nobody can take it back.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, throw away'), style: 'destructive', onPress: () => onDrop(c) }])}
                />
              </View>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
