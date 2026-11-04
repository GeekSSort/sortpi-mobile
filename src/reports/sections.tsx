import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { Icon, type IconName } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { PayColors } from '@/constants/palette';
import { Radius, Spacing } from '@/constants/theme';
import { WEEKDAYS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT, addMoney, compareMoney } from '@/lib/money';
import { itemName } from '@/sell/catalog-map';
import { METHOD_LABEL } from '@/sales/logic';

import type { KindRow, ProductRow, TenderRow } from './api';
import { dailyBars, margin, pnlLines, topN, type PnL } from './logic';

type Q = { isPending: boolean; isError: boolean; refetch: () => unknown };

/** A titled white card. Loading shows placeholders, a failure shows what to do, and only then the content. */
export function ReportCard({ title, icon, query, hint, children }: { title: string; icon: IconName; query?: Q; hint?: string; children: ReactNode }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <View style={{ gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
          <Icon name={icon} size={18} color={theme.brandText} />
        </View>
        <ThemedText type="bodyMedium" style={{ flex: 1 }}>
          {title}
        </ThemedText>
      </View>
      {hint ? (
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
      {query?.isPending ? <SkeletonRows count={3} /> : null}
      {query?.isError ? <ErrorState message={t('Could not load this part.')} onRetry={() => void query.refetch()} /> : null}
      {!query || (!query.isPending && !query.isError) ? children : null}
    </View>
  );
}

const money = (v: string) => formatBDT(v, { dp: 0 });

/** One bar per day, the best day darkest, with what it sold. Under 11 days every bar is named; longer windows name every fifth. */
export function DailyBars({ rows, from, to }: { rows: { date: string; revenue: string }[]; from: string; to: string }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const bars = dailyBars(rows, from, to);
  const best = bars.find((b) => b.best);
  const many = bars.length > 10;
  const label = (iso: string, i: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!many) return WEEKDAYS[lang][new Date(y, m - 1, d).getDay()];
    return i % 5 === 0 || i === bars.length - 1 ? String(d) : '';
  };
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: many ? 2 : 6, height: 120 }}>
        {bars.map((b) => (
          <View key={b.date} accessibilityLabel={`${b.date}: ${money(b.revenue)}`} style={{ flex: 1, height: Math.max(4, Math.round(b.fraction * 120)), borderRadius: 4, backgroundColor: b.best ? theme.success : b.fraction > 0 ? theme.positive : theme.border, opacity: b.fraction > 0 && !b.best ? 0.55 : 1 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: many ? 2 : 6 }}>
        {bars.map((b, i) => (
          <ThemedText key={b.date} type="caption" themeColor="textMuted" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1} literal>
            {label(b.date, i)}
          </ThemedText>
        ))}
      </View>
      {best ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="CheckCircle" size={16} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.success }} literal>
            {t('Best day: {date} · {amount}', { date: best.date.split('-').reverse().slice(0, 2).join('/'), amount: money(best.revenue) })}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const TENDER_ICON: Record<string, IconName> = { CASH: 'Cash', MOBILE: 'Phone', CARD: 'CreditCard', BANK: 'Bank' };

/** What the shop was paid in, each way in its own colour with its picture and its share of the takings. */
export function HowPaid({ rows }: { rows: TenderRow[] }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const dark = useColorScheme() === 'dark';
  if (rows.length === 0) return <ThemedText type="small" themeColor="textMuted">No payments in this time.</ThemedText>;
  return (
    <View style={{ gap: Spacing.three }}>
      {rows.map((r) => {
        const pay = PayColors[r.method as keyof typeof PayColors];
        const ink = pay ? (dark ? pay.ink.dark : pay.ink.light) : theme.textSecondary;
        return (
          <View key={r.method} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <Icon name={TENDER_ICON[r.method] ?? 'Cash'} size={20} color={ink} />
              <ThemedText type="smallMedium" style={{ flex: 1 }}>
                {t(METHOD_LABEL[r.method] ?? r.label)}
              </ThemedText>
              <ThemedText type="smallMedium" style={{ color: ink }} literal>
                {money(r.amount)}
              </ThemedText>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.border, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, Number(r.share))}%`, height: 10, backgroundColor: pay ? pay.fill : theme.textMuted }} />
            </View>
            <ThemedText type="caption" themeColor="textMuted" literal>
              {`${Number(r.share).toFixed(0)}% · ${t('{n} payments', { n: r.payment_count })}`}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/** The top sellers by money, numbered. Profit appears only when the server sent it. */
export function BestSellers({ rows }: { rows: ProductRow[] }) {
  const theme = useTheme();
  const { t } = usePrefs();
  if (rows.length === 0) return <ThemedText type="small" themeColor="textMuted">Nothing was sold in this time.</ThemedText>;
  return (
    <View style={{ gap: Spacing.three }}>
      {topN(rows, 5).map((r, i) => (
        <View key={r.variant_id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? theme.success : theme.brandSoft }}>
            <ThemedText type="smallMedium" style={{ color: i === 0 ? theme.onBrand : theme.brandText }} literal>
              {String(i + 1)}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallMedium" numberOfLines={2} literal>
              {itemName(r.product_name, r.variant_name)}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" literal>
              {t('{n} sold', { n: Number(r.quantity_sold) })}
            </ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText type="smallMedium" style={{ color: theme.success }} literal>
              {money(r.revenue)}
            </ThemedText>
            {r.gross_profit !== undefined ? (
              <ThemedText type="caption" style={{ color: compareMoney(r.gross_profit, '0') < 0 ? theme.danger : theme.success }} literal>
                {`${t('You keep')} ${money(r.gross_profit)}`}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Sales by kind of item, as bars against the biggest. */
export function ByKind({ rows }: { rows: KindRow[] }) {
  const theme = useTheme();
  const { t } = usePrefs();
  if (rows.length === 0) return <ThemedText type="small" themeColor="textMuted">Nothing was sold in this time.</ThemedText>;
  const shown = topN(rows, 6);
  const max = shown.reduce((m, r) => (compareMoney(r.revenue, m) > 0 ? r.revenue : m), '0');
  return (
    <View style={{ gap: Spacing.three }}>
      {shown.map((r) => (
        <View key={r.category_id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
            <ThemedText type="smallMedium" style={{ flex: 1 }} numberOfLines={1} literal>
              {r.category_name}
            </ThemedText>
            <ThemedText type="smallMedium" literal>
              {money(r.revenue)}
            </ThemedText>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.border, overflow: 'hidden' }}>
            <View style={{ width: `${compareMoney(max, '0') > 0 ? Math.round((Number(r.revenue) / Number(max)) * 100) : 0}%`, height: 10, backgroundColor: theme.brand }} />
          </View>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {t('{n} sold', { n: Number(r.quantity_sold) })}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

/** The profit statement: money in green, what it cost in red, stock found or lost in words, and the answer on a band of its own. */
export function ProfitStatement({ pnl }: { pnl: PnL }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const lines = pnlLines(pnl);
  const m = margin(pnl.gross_profit, pnl.revenue);
  return (
    <View style={{ gap: Spacing.one }}>
      {lines.map((l) => {
        const total = l.kind === 'total';
        const bad = compareMoney(l.value, '0') < 0;
        const tint = l.kind === 'cost' || l.kind === 'loss' ? theme.danger : l.kind === 'gain' || l.kind === 'plain' ? theme.success : bad ? theme.danger : theme.success;
        const sign = l.kind === 'cost' || l.kind === 'loss' ? '− ' : l.kind === 'gain' ? '+ ' : '';
        return (
          <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: total ? 14 : 10, paddingHorizontal: total ? Spacing.three : 0, marginTop: total ? Spacing.two : 0, borderRadius: Radius.md, backgroundColor: total ? (bad ? theme.dangerSoft : theme.successSoft) : 'transparent', borderTopWidth: l.kind === 'subtotal' ? 1 : 0, borderTopColor: theme.border }}>
            {total ? <Icon name={bad ? 'TriangleAlert' : 'CheckCircle'} size={22} color={tint} /> : null}
            <View style={{ flex: 1 }}>
              <ThemedText type={total || l.kind === 'subtotal' ? 'bodyMedium' : 'small'} themeColor={total || l.kind === 'subtotal' ? 'text' : 'textSecondary'}>
                {l.label}
              </ThemedText>
              {l.kind === 'subtotal' && m ? (
                <ThemedText type="caption" themeColor="textMuted" literal>
                  {t('{n}% of sales', { n: m })}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type={total ? 'title' : 'smallMedium'} style={{ color: tint }} literal>
              {`${sign}${money(l.value)}`}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

type Due = { id: string; name: string; amount: string };
export const customerDues = (rows: { customer_id: string; customer_name: string; outstanding: string }[]): Due[] => rows.map((r) => ({ id: r.customer_id, name: r.customer_name, amount: r.outstanding }));
export const supplierDues = (rows: { supplier_id: string; supplier_name: string; outstanding: string }[]): Due[] => rows.map((r) => ({ id: r.supplier_id, name: r.supplier_name, amount: r.outstanding }));

/** Who owes the shop, or who the shop owes: the biggest five, always red, each opening that person's page. */
export function Dues({ rows, kind }: { rows: Due[]; kind: 'customer' | 'supplier' }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const owed = rows.filter((r) => compareMoney(r.amount, '0') > 0);
  if (owed.length === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="CheckCircle" size={18} color={theme.success} />
        <ThemedText type="small" style={{ color: theme.success }}>
          {kind === 'customer' ? 'Nobody owes you anything.' : 'You owe nobody anything.'}
        </ThemedText>
      </View>
    );
  }
  const total = owed.reduce((s, r) => addMoney(s, r.amount), '0');
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerBorder }}>
        <Icon name={kind === 'customer' ? 'Users' : 'Package'} size={22} color={theme.danger} />
        <View style={{ flex: 1 }}>
          <ThemedText type="caption" themeColor="textSecondary">
            {kind === 'customer' ? 'Total owed to you' : 'Total you owe'}
          </ThemedText>
          <ThemedText type="title" style={{ color: theme.danger }} literal>
            {money(total)}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary" literal>
          {kind === 'customer' ? t('{n} customers', { n: owed.length }) : t('{n} suppliers', { n: owed.length })}
        </ThemedText>
      </View>
      {topN(owed, 5).map((r) => (
        <Tap key={r.id} accessibilityRole="button" accessibilityLabel={`${r.name}, ${money(r.amount)}`} onPress={() => router.push(kind === 'customer' ? { pathname: '/customer/[id]', params: { id: r.id } } : { pathname: '/supplier/[id]', params: { id: r.id } })} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <ThemedText type="smallMedium" style={{ flex: 1 }} numberOfLines={1} literal>
            {r.name}
          </ThemedText>
          <ThemedText type="smallMedium" style={{ color: theme.danger }} literal>
            {money(r.amount)}
          </ThemedText>
          <Icon name="ChevronRight" size={16} color={theme.textMuted} />
        </Tap>
      ))}
      {owed.length > 5 ? (
        <ThemedText type="caption" themeColor="textMuted" literal>
          {t('and {n} more', { n: owed.length - 5 })}
        </ThemedText>
      ) : null}
    </View>
  );
}
