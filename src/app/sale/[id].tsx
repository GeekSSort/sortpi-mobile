import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MONTHS, saleWhen } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { receiptText } from '@/sell/receipt';
import { getSale, type Sale } from '@/sales/api';
import { isWalkIn, METHOD_LABEL, saleState } from '@/sales/logic';
import { canReturn } from '@/sales/returns';

/** One sale as the customer would read it: what was bought, what it came to, how it was paid, and a receipt to send. */
export default function SaleScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sale = useQuery({ queryKey: ['sale', id], queryFn: () => getSale(id), enabled: !!id });
  const s = sale.data;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      {sale.isPending ? <SkeletonRows count={4} /> : null}
      {sale.isError ? <ErrorState message={t('Could not load this sale.')} onRetry={() => void sale.refetch()} /> : null}
      {s ? <Body sale={s} lang={lang} shop={me?.organization?.name ?? 'SortPi'} canRefund={(me?.permissions?.includes('sale.refund') ?? false) && canReturn(s)} /> : null}
      {s?.status === 'CANCELLED' ? <Notice kind="info">{s.cancel_reason ? t('This sale was cancelled: {reason}', { reason: s.cancel_reason }) : t('This sale was cancelled.')}</Notice> : null}
    </ScrollView>
  );
}

function Body({ sale, lang, shop, canRefund }: { sale: Sale; lang: 'en' | 'bn'; shop: string; canRefund: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = usePrefs();
  const state = saleState(sale);
  const when = saleWhen(sale.sale_date);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const tone = { paid: [theme.successSoft, theme.success], due: [theme.dangerSoft, theme.danger], returned: [theme.warningSoft, theme.warning], cancelled: [theme.backgroundElement, theme.textMuted] }[state];
  const stateWord = { paid: t('Paid'), due: t('Owes {amount}', { amount: formatBDT(sale.due_amount) }), returned: t('Goods sent back'), cancelled: t('Cancelled') }[state];
  const card = { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous' as const, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border };

  return (
    <>
      <View style={{ ...card, backgroundColor: tone[0], borderColor: 'transparent', alignItems: 'center' }}>
        <ThemedText type="caption" themeColor="textSecondary">
          {t('Invoice {n}', { n: sale.invoice_number })}
        </ThemedText>
        <ThemedText type="hero" style={{ color: tone[1] }}>
          {formatBDT(sale.grand_total)}
        </ThemedText>
        <ThemedText type="smallMedium" style={{ color: tone[1] }}>
          {stateWord}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {day} · {when.time}
        </ThemedText>
      </View>

      <View style={card}>
        <Row label="Customer" value={isWalkIn(sale.customer_name) ? t('Walk-in customer') : sale.customer_name} />
        {sale.customer_phone ? <Row label="Phone" value={sale.customer_phone} /> : null}
        {sale.cashier_name ? <Row label="Sold by" value={sale.cashier_name} /> : null}
        {sale.note ? <Row label="Note" value={sale.note} /> : null}
      </View>

      <View style={card}>
        <ThemedText type="bodyMedium">Items</ThemedText>
        {sale.items.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', gap: Spacing.three, paddingVertical: 6, borderTopWidth: 1, borderTopColor: theme.border }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallMedium" literal>{it.product_name}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {Number(it.quantity)}
                {it.unit_allow_decimal && it.unit_short_name ? ` ${it.unit_short_name}` : ''} × {formatBDT(it.unit_price)}
                {Number(it.returned_quantity) > 0 ? ` · ${t('{n} sent back', { n: Number(it.returned_quantity) })}` : ''}
              </ThemedText>
            </View>
            <ThemedText type="smallMedium">{formatBDT(it.charged_total)}</ThemedText>
          </View>
        ))}
      </View>

      <View style={card}>
        <Row label="Subtotal" value={formatBDT(sale.subtotal)} />
        {Number(sale.discount_amount) > 0 ? <Row label="Discount" value={`− ${formatBDT(sale.discount_amount)}`} /> : null}
        {Number(sale.tax_amount) > 0 ? <Row label="Tax" value={formatBDT(sale.tax_amount)} /> : null}
        <Row label="Total" value={formatBDT(sale.grand_total)} strong />
        <Row label="Paid" value={formatBDT(sale.paid_amount)} />
        {Number(sale.due_amount) > 0 ? <Row label="Still owed" value={formatBDT(sale.due_amount)} danger /> : null}
        {Number(sale.returned_amount) > 0 ? <Row label="Given back" value={formatBDT(sale.returned_amount)} /> : null}
      </View>

      {sale.payments.length ? (
        <View style={card}>
          <ThemedText type="bodyMedium">How it was paid</ThemedText>
          {sale.payments.map((p) => (
            <Row key={p.id} label={METHOD_LABEL[p.payment_method] ?? p.payment_method} value={formatBDT(p.amount)} sub={p.reference_no || undefined} />
          ))}
        </View>
      ) : null}

      {canRefund ? <Button title="Take goods back" variant="secondary" onPress={() => router.push({ pathname: '/return/[id]', params: { id: sale.id } })} /> : null}
      <Button
        title="Share receipt"
        variant="secondary"
        onPress={() =>
          void Share.share({
            message: receiptText({
              shop,
              invoice: sale.invoice_number,
              customer: isWalkIn(sale.customer_name) ? null : sale.customer_name,
              lines: sale.items.map((it) => ({ name: it.product_name, unitLabel: it.unit_allow_decimal ? it.unit_short_name : null, quantity: it.quantity, unitPrice: it.unit_price, total: it.charged_total })),
              total: sale.grand_total,
              paid: sale.paid_amount,
              due: sale.due_amount,
            }),
          })
        }
      />
    </>
  );
}

function Row({ label, value, sub, strong, danger }: { label: string; value: string; sub?: string; strong?: boolean; danger?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <View style={{ flex: 1 }}>
        <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
        {sub ? (
          <ThemedText type="caption" themeColor="textMuted" literal>
            {sub}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} literal style={danger ? { color: theme.danger } : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}
