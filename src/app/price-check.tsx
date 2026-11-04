import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { Pill, useLevelStyle } from '@/products/variant-card';
import { Scanner } from '@/scan/scanner';
import { findWarehouseId, lookupForPriceCheck } from '@/sell/api';
import { describeSellError } from '@/sell/messages';
import { notFoundText, toPriceCheck, type PriceCheck } from '@/sell/price-check';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { stockOfVariant } from '@/stock/api';
import { formatQuantity, stockLevel } from '@/stock/status';

/** What does this cost, and is it in stock? Scan the barcode or type the code. Nothing is added to a sale. */
export default function PriceCheckScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const usesBarcodes = useUsesBarcodes();
  const branchId = me?.active_branch?.id;
  const perms = me?.permissions ?? [];
  const [typed, setTyped] = useState('');
  const [asked, setAsked] = useState<{ code: string; scanned: boolean; n: number } | null>(null);

  // One call: the price from the lookup, then the stock line when this person may read stock. A failed stock read only drops that line.
  const check = useQuery({
    queryKey: ['price-check', branchId, asked?.code, asked?.scanned, asked?.n],
    enabled: !!asked && !!branchId,
    retry: false,
    queryFn: async (): Promise<{ check: PriceCheck; stock: Stock | null } | null> => {
      const r = await lookupForPriceCheck(asked!.scanned ? 'barcode' : 'code', asked!.code, branchId!);
      if (!r) return null;
      const c = toPriceCheck(r);
      let stock: Stock | null = null;
      if (perms.includes('inventory.view')) {
        try {
          const row = await stockOfVariant(await findWarehouseId(branchId!), c.variantId);
          if (row) stock = { quantity: row.quantity, available: row.available, reorder: row.reorder_level, allowDecimal: row.unit_allow_decimal, unit: row.unit_short_name };
        } catch {
          stock = null;
        }
      }
      return { check: c, stock };
    },
  });

  if (!perms.includes('product.view')) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }

  function ask(code: string, scanned: boolean) {
    const c = code.trim();
    if (!c) return;
    haptics.tap();
    setAsked((a) => ({ code: c, scanned, n: (a?.n ?? 0) + 1 }));
  }
  const busy = !!asked && check.isFetching;
  const missing = !!asked && check.isSuccess && check.data === null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Check a price') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.three, padding: Spacing.three, paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {usesBarcodes ? <Scanner onCode={(c) => ask(c, true)} paused={busy} height={200} /> : null}
        <Field label="Barcode or item code" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => ask(typed, false)} />
        <Button title="Check the price" disabled={!typed.trim() || busy} loading={busy && !asked?.scanned} onPress={() => ask(typed, false)} />

        {busy && !check.data ? <SkeletonRows /> : null}
        {check.isError ? <ErrorState message={t(describeSellError(check.error))} onRetry={() => void check.refetch()} /> : null}
        {missing && asked ? (
          <View style={{ gap: 8, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: theme.warning }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="TriangleAlert" size={20} color={theme.warning} />
              <ThemedText type="bodyMedium">Not found</ThemedText>
            </View>
            <ThemedText type="small" literal>
              {t(notFoundText(asked.code).text, notFoundText(asked.code).vars)}
            </ThemedText>
          </View>
        ) : null}
        {check.data ? <Result data={check.data} /> : null}
      </ScrollView>
    </View>
  );
}

type Stock = { quantity: string; available: string; reorder: string; allowDecimal: boolean | null; unit: string | null };

function Result({ data }: { data: { check: PriceCheck; stock: Stock | null } }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const level = useLevelStyle();
  const { check: c, stock } = data;
  const look = stock ? level(stockLevel(stock.available, stock.reorder)) : null;
  return (
    <View style={{ gap: 12, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="heading" literal>
        {c.name}
      </ThemedText>
      {c.sku ? (
        <ThemedText type="caption" themeColor="textMuted" selectable literal>
          {c.sku}
        </ThemedText>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <ThemedText type="title" literal style={{ color: theme.success }}>
          {formatBDT(c.price)}
        </ThemedText>
        {c.unitShort ? (
          <ThemedText type="small" themeColor="textMuted" literal>
            {t('for each {unit}', { unit: c.unitShort })}
          </ThemedText>
        ) : null}
      </View>
      {c.mrp ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pill icon="Tag" text={t('Printed price {amount}', { amount: formatBDT(c.mrp) })} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} />
          {c.saving ? <Pill icon="CheckCircle" text={t('You save {amount}', { amount: formatBDT(c.saving) })} fg={theme.success} soft={theme.successSoft} line={theme.successBorder} /> : null}
        </View>
      ) : null}
      {c.pack ? <Pill icon="Package" text={t('{name}: {amount}', { name: c.pack.name, amount: formatBDT(c.pack.price) })} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandSoftBorder} /> : null}
      {stock && look ? <Pill icon={look.icon} text={`${look.word} · ${formatQuantity(stock.available, stock.allowDecimal)}${stock.unit ? ` ${stock.unit}` : ''}`} fg={look.fg} soft={look.soft} line={look.line} /> : null}
    </View>
  );
}
