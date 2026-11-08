import * as Print from 'expo-print';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { clampCopies, labelsHtml, SIZES, type LabelSize } from '@/extras/labels';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { ItemFinder } from '@/purchases/item-finder';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { LineCard } from '@/extras/line-card';

type Row = { variantId: string; name: string; sku: string; price: string; copies: string };

/** Print price labels with a barcode for the items you pick, through Android's print screen (a label printer, a Wi-Fi printer or Save as PDF). Drawn on the phone; nothing is sent to the shop's server. */
export default function BarcodeLabelsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id ?? '';
  const [rows, setRows] = useState<Row[]>([]);
  const [size, setSize] = useState<LabelSize>('medium');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = rows.reduce((n, r) => n + clampCopies(Number(r.copies)), 0);

  const add = (it: { variantId: string; name: string; sku: string; price: string }) => {
    haptics.tap();
    setRows((rs) => (rs.some((r) => r.variantId === it.variantId) ? rs : [...rs, { variantId: it.variantId, name: it.name, sku: it.sku, price: it.price, copies: '1' }]));
  };
  async function print() {
    setBusy(true);
    try {
      await Print.printAsync({ html: labelsHtml(rows.map((r) => ({ name: r.name, price: r.price, code: r.sku, copies: Number(r.copies) })), size) });
    } catch {
      Alert.alert(t('Labels not printed'), t('The labels could not be printed. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Barcode Labels') }} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }}>
        <ThemedText type="bodyMedium">Label size</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {(Object.keys(SIZES) as LabelSize[]).map((k) => {
            const on = size === k;
            return (
              <Tap key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSize(k)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: on ? theme.brand : theme.border }}>
                <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                  {SIZES[k].label}
                </ThemedText>
              </Tap>
            );
          })}
        </View>
        {rows.map((r) => (
          <LineCard key={r.variantId} name={r.name} sku={r.sku} quantity={r.copies} quantityLabel="How many labels" allowDecimal={false} onQuantity={(v) => setRows((rs) => rs.map((x) => (x.variantId === r.variantId ? { ...x, copies: v.replace(/\D/g, '') } : x)))} onRemove={() => setRows((rs) => rs.filter((x) => x.variantId !== r.variantId))} />
        ))}
        <Button title={rows.length ? 'Add another item' : 'Add an item'} variant="secondary" onPress={() => setAdding(true)} trailing={<Icon name="Plus" size={18} color={theme.brandText} />} />
        {rows.length > 0 && total === 0 ? <Notice kind="info">Choose how many labels each item needs.</Notice> : null}
        <Button title={total ? `${t('Print')} ${total}` : 'Print'} variant="success" size="lg" loading={busy} disabled={total === 0} onPress={() => void print()} />
      </KeyboardAwareScrollView>
      <ItemFinder visible={adding} onClose={() => setAdding(false)} branchId={branchId} canScan={usesBarcodes} countOf={(v) => (rows.some((r) => r.variantId === v) ? 1 : 0)} onPick={(it) => { add(it); setAdding(false); }} onCode={add} />
    </View>
  );
}
