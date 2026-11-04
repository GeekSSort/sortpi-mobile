import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { landingTab } from '@/auth/roles';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { Screen } from '@/components/screen';
import { SetupChecklist } from '@/components/setup-checklist';
import { SkeletonRows } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Tap } from '@/components/tap';
import { ToneTile as Tile } from '@/components/tone-tile';
import { Radius, Spacing } from '@/constants/theme';
import { customerSummary } from '@/customers/api';
import { amountDue } from '@/customers/logic';
import { biggestDebts, lowStockItems, previousSixDaySales, recentSales, salesToday, type DayTotal, type RecentSale } from '@/home/api';
import { barFractions, lastSevenDays, MONTHS, saleWhen, WEEKDAYS } from '@/home/week';
import { localDateISO } from '@/lib/dates';
import { usePrefs } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';
import { isWalkIn } from '@/sales/logic';
import { formatBDT } from '@/lib/money';
import { stockSummary } from '@/stock/api';
import { formatQuantity } from '@/stock/status';

/** The shop at a glance, in plain words: today's takings, who owes, what is running out, the week, the latest sales. */
export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const { me } = useSession();
  const can = (...codes: string[]) => codes.some((c) => me?.permissions?.includes(c));
  const seeSales = !!me && can('sale.view', 'sale.view_own');
  const seeCustomers = !!me && can('customer.view');
  const seeStock = !!me && can('inventory.view', 'product.view');
  const q = { retry: false, staleTime: 30_000 } as const;

  const today = useQuery({ queryKey: ['home', 'today'], queryFn: salesToday, enabled: seeSales, ...q });
  // Outside the 'home' key on purpose: a sale invalidates 'home' (today changes) but not the past days.
  const past = useQuery({ queryKey: ['week-past', localDateISO()], queryFn: previousSixDaySales, enabled: seeSales, retry: false, staleTime: 30 * 60_000 });
  const weekDays: DayTotal[] | undefined = past.data && today.data ? [...past.data, { ...lastSevenDays()[6], total: today.data.total, count: today.data.count }] : undefined;
  const recent = useQuery({ queryKey: ['home', 'recent'], queryFn: recentSales, enabled: seeSales, ...q });
  const owed = useQuery({ queryKey: ['customers', 'summary'], queryFn: customerSummary, enabled: seeCustomers, ...q });
  const debts = useQuery({ queryKey: ['home', 'debts'], queryFn: biggestDebts, enabled: seeCustomers, ...q });
  const shelf = useQuery({ queryKey: ['stock', 'summary', 'shelf'], queryFn: () => stockSummary(false), enabled: seeStock, ...q });
  const low = useQuery({ queryKey: ['home', 'low'], queryFn: lowStockItems, enabled: seeStock, ...q });

  // A role with no dashboard opens on its own first tab (cashier: Sell). This screen is not in their tab bar.
  const landing = landingTab(me?.permissions ?? []);
  if (me && landing !== 'index') return <Redirect href={landing === 'sell' ? '/sell' : landing === 'stock' ? '/stock' : landing === 'customers' ? '/customers' : '/more'} />;

  const canSell = can('pos.access') && can('sale.create');
  const sales = today.data;
  const o = owed.data;
  const k = shelf.data;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} />
        <View style={{ flex: 1 }}>
          <ThemedText type="heading" literal>{me?.organization.name ?? 'SortPi'}</ThemedText>
          <ThemedText type="small" themeColor="textMuted" literal>
            {me?.active_branch?.name ?? t('All branches')}
          </ThemedText>
        </View>
      </View>

      {canSell ? <Button title="Start selling" size="lg" onPress={() => router.push('/sell')} trailing={<Icon name="ArrowRight" size={20} color="#fff" />} /> : null}

      <SetupChecklist />

      {sales || o || k ? (
        <View style={{ gap: Spacing.two }}>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {sales ? <Tile label="Sold today" icon="Cash" tone="good" delay={0} onPress={() => router.push('/sales')} value={formatBDT(sales.total, { dp: 0 })} note={sales.count === 1 ? t('1 sale') : t('{n} sales', { n: sales.count })} /> : null}
            {o ? <Tile label="Customers owe you" icon="Users" delay={70} onPress={() => router.navigate({ pathname: '/customers', params: { owes: '1', n: String(Date.now()) } })} value={formatBDT(o.total_receivable, { dp: 0 })} tone={amountDue(o.total_receivable) === '0.00' ? 'good' : 'bad'} note={o.with_due === 1 ? t('1 customer to ask for money') : t('{n} customers to ask for money', { n: o.with_due })} /> : null}
          </View>
          {k ? (
            <View style={{ flexDirection: 'row', gap: Spacing.two }}>
              <Tile label="Running low" icon="TriangleAlert" delay={140} onPress={() => router.navigate({ pathname: '/stock', params: { filter: 'low', n: String(Date.now()) } })} value={String(k.low_stock)} tone={k.low_stock > 0 ? 'warn' : 'good'} note={k.low_stock === 1 ? t('1 item') : t('{n} items', { n: k.low_stock })} />
              <Tile label="Finished" icon="Cancel" delay={210} onPress={() => router.navigate({ pathname: '/stock', params: { filter: 'out', n: String(Date.now()) } })} value={String(k.out_of_stock)} tone={k.out_of_stock > 0 ? 'bad' : 'good'} note={k.out_of_stock === 1 ? t('1 item') : t('{n} items', { n: k.out_of_stock })} />
            </View>
          ) : null}
        </View>
      ) : null}

      {seeSales ? (
        <Section title="Last 7 days">
          {!weekDays && (past.isPending || today.isPending) ? <SkeletonRows count={2} /> : weekDays ? <WeekChart days={weekDays} lang={lang} /> : null}
        </Section>
      ) : null}

      {seeStock && (low.data?.length ?? 0) > 0 ? (
        <Section title="Running low" action={{ label: 'See all', onPress: () => router.push('/stock') }}>
          {low.data?.map((r) => (
            <Row key={r.id} title={r.variant_name && r.variant_name.toLowerCase() !== 'default' ? `${r.product_name} · ${r.variant_name}` : r.product_name} right={`${formatQuantity(r.available, r.unit_allow_decimal)}${r.unit_short_name ? ` ${r.unit_short_name}` : ''}`} rightTone="warning" />
          ))}
        </Section>
      ) : null}

      {seeCustomers && (debts.data?.length ?? 0) > 0 ? (
        <Section title="Customers who owe the most" action={{ label: 'See all', onPress: () => router.push('/customers') }}>
          {debts.data?.map((c) => (
            <Row key={c.id} title={c.name} sub={c.phone} right={formatBDT(amountDue(c.current_balance))} rightTone="danger" onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })} />
          ))}
        </Section>
      ) : null}

      {seeSales ? (
        <Section title="Recent sales" action={{ label: 'See all', onPress: () => router.push('/sales') }}>
          {recent.isPending ? <SkeletonRows count={3} /> : null}
          {recent.data?.length === 0 ? (
            <ThemedText type="small" themeColor="textMuted" style={{ padding: Spacing.three }}>
              No sales yet.
            </ThemedText>
          ) : null}
          {recent.data?.map((s) => (
            <SaleRow key={s.id} sale={s} lang={lang} onPress={() => router.push({ pathname: '/sale/[id]', params: { id: s.id } })} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}


/** A titled block of rows on the card colour, like a settings group: no box around every row. */
function Section({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <ThemedText type="bodyMedium">{title}</ThemedText>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} style={{ minHeight: 48, paddingHorizontal: 4, justifyContent: 'center', marginVertical: -12 }}>
            <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
              {action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <View style={{ borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>{children}</View>
    </View>
  );
}

function Row({ title, sub, right, rightTone, onPress }: { title: string; sub?: string; right: string; rightTone?: 'danger' | 'warning'; onPress?: () => void }) {
  const theme = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={2}>
          {title}
        </ThemedText>
        {sub ? (
          <ThemedText type="caption" themeColor="textMuted">
            {sub}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="bodyMedium" style={{ color: rightTone === 'danger' ? theme.danger : rightTone === 'warning' ? theme.warning : theme.text }}>
        {right}
      </ThemedText>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: theme.backgroundSelected }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

function SaleRow({ sale, lang, onPress }: { sale: RecentSale; lang: 'en' | 'bn'; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const when = saleWhen(sale.sale_date);
  const day = when.day === 'today' ? t('Today') : when.day === 'yesterday' ? t('Yesterday') : `${when.day.date} ${MONTHS[lang][when.day.month]}`;
  const owes = Number(sale.due_amount) > 0;
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {isWalkIn(sale.customer_name) ? t('Walk-in customer') : sale.customer_name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {day} · {when.time}
        </ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <ThemedText type="bodyMedium">{formatBDT(sale.grand_total, { dp: 0 })}</ThemedText>
        {owes ? (
          <ThemedText type="caption" style={{ color: theme.danger }}>
            {t('Owes {amount}', { amount: formatBDT(sale.due_amount, { dp: 0 }) })}
          </ThemedText>
        ) : null}
      </View>
    </Tap>
  );
}

function WeekChart({ days, lang }: { days: DayTotal[]; lang: 'en' | 'bn' }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const totals = days.map((d) => Number(d.total));
  const fr = barFractions(totals);
  const sum = totals.reduce((a, b) => a + b, 0);
  return (
    <View style={{ padding: Spacing.three, gap: Spacing.three }}>
      <View>
        <ThemedText type="title">{formatBDT(String(sum), { dp: 0 })}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {sum > 0 ? t('Sold in 7 days') : t('Nothing sold in the last 7 days yet.')}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, height: 96 }}>
        {days.map((d, i) => (
          <View key={d.date} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <View style={{ width: '100%', height: `${Math.max(fr[i]! * 100, totals[i]! > 0 ? 6 : 2)}%`, borderRadius: 6, backgroundColor: i === days.length - 1 ? theme.brand : theme.brandSoftBorder, opacity: totals[i]! > 0 ? 1 : 0.5 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {days.map((d, i) => (
          <ThemedText key={d.date} type="caption" themeColor={i === days.length - 1 ? 'brandText' : 'textMuted'} style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {WEEKDAYS[lang][d.weekday]}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}
