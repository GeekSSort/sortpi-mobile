import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Icon, type IconName } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { customerSummary } from '@/customers/api';
import { useDesktopShell, useShellSidebarWidth } from '@/hooks/use-desktop-shell';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { localDateISO } from '@/lib/dates';
import { formatBDT } from '@/lib/money';
import { HomeSidebar } from '@/menu/drawer';
import { resolvedSettings } from '@/settings/api';
import { KEYS } from '@/settings/logic';

import { lowStockItems } from './api';
import { dashboardActivity, dashboardBundle, dashboardCustomers, dashboardProducts, dashboardSalesDays, dashboardStock, type DashboardRange } from './tablet-api';

const RANGES = ['All time', 'Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'This month'] as const;
type Range = (typeof RANGES)[number];

const TONES = {
  blue: { ink: '#2563eb', fill: '#e8f0fe' },
  orange: { ink: '#ea580c', fill: '#fff7ed' },
  green: { ink: '#16a34a', fill: '#e8f8ee' },
  red: { ink: '#dc2626', fill: '#fdecec' },
};

function datesFor(range: Range, now: Date): DashboardRange | undefined {
  if (range === 'All time') return undefined;
  const end = new Date(now);
  if (range === 'Yesterday') end.setDate(now.getDate() - 1);
  const start = new Date(end);
  if (range === 'Last 7 days') start.setDate(end.getDate() - 6);
  if (range === 'Last 30 days') start.setDate(end.getDate() - 29);
  if (range === 'This month') start.setDate(1);
  return { from_date: localDateISO(start), to_date: localDateISO(end) };
}

function validDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function previousRange(range?: DashboardRange): DashboardRange | undefined {
  if (!range) return undefined;
  const start = Date.parse(range.from_date);
  const end = Date.parse(range.to_date);
  const day = 86_400_000;
  return { from_date: new Date(start - (end - start + day)).toISOString().slice(0, 10), to_date: new Date(start - day).toISOString().slice(0, 10) };
}

function money(value?: string | number) {
  return value == null ? '—' : formatBDT(String(value));
}

export function TabletDashboard({ width }: { width: number }) {
  const { me } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState<Range>('All time');
  const [filterOpen, setFilterOpen] = useState(false);
  const [custom, setCustom] = useState<DashboardRange>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const shell = useDesktopShell(); // then the app already shows the menu beside every screen
  const shellWidth = useShellSidebarWidth();
  const sidebarWidth = Math.min(264, Math.round(width * 0.28));
  const fourAcross = width - (shell ? shellWidth : sidebarWidth) >= 760;
  const branch = me?.active_branch?.id;
  const now = new Date();
  const range = custom ?? datesFor(preset, now);
  const previous = previousRange(range);
  const dateLabel = custom ? `${custom.from_date} – ${custom.to_date}` : t(preset);
  const today = datesFor('Today', now);
  const can = (permission: string) => me?.permissions?.includes(permission) === true;
  const scope = [me?.organization.id, me?.id, branch] as const;
  const common = { staleTime: 30_000, retry: false } as const;
  const base = useQuery({ queryKey: ['home', 'tablet', ...scope, 'bundle', range], queryFn: () => dashboardBundle(branch, range), ...common });
  const comparison = useQuery({ queryKey: ['home', 'tablet', ...scope, 'comparison', previous], queryFn: () => dashboardBundle(branch, previous), enabled: !!previous, ...common });
  const stock = useQuery({ queryKey: ['home', 'tablet', ...scope, 'stock'], queryFn: () => dashboardStock(branch), enabled: can('inventory.view') || can('product.view'), ...common });
  const customers = useQuery({ queryKey: ['customers', 'summary', ...scope], queryFn: customerSummary, enabled: can('customer.view'), ...common });
  const top = useQuery({ queryKey: ['home', 'tablet', ...scope, 'top-products', range], queryFn: () => dashboardProducts(branch, range), enabled: can('report.sales'), ...common });
  const ranked = useQuery({ queryKey: ['home', 'tablet', ...scope, 'top-customers', range], queryFn: () => dashboardCustomers(branch, range), enabled: can('report.sales'), ...common });
  const low = useQuery({ queryKey: ['home', 'tablet', ...scope, 'low-stock'], queryFn: lowStockItems, enabled: can('inventory.view') || can('product.view'), ...common });
  const activity = useQuery({ queryKey: ['home', 'tablet', ...scope, 'activity', range], queryFn: () => dashboardActivity(branch, range), enabled: can('sale.view') || can('sale.view_own'), ...common });
  const todaySales = useQuery({ queryKey: ['home', 'tablet', ...scope, 'bundle', today], queryFn: () => dashboardBundle(branch, today), ...common });
  const settings = useQuery({ queryKey: ['home', 'tablet', ...scope, 'settings'], queryFn: resolvedSettings, enabled: can('settings.view'), ...common });

  const sales = base.data?.sales_summary;
  const purchases = base.data?.purchase_summary;
  const pnl = base.data?.finance_pnl;
  const prior = previous ? comparison.data : undefined;
  const cards: { title: string; value?: string | number; prior?: string | number; currency?: boolean; icon: IconName; tone: keyof typeof TONES; href?: Href }[] = [
    { title: 'Total Sales', value: sales?.revenue, prior: prior?.sales_summary?.revenue, currency: true, icon: 'Cash', tone: 'blue', href: can('sale.view') || can('sale.view_own') ? '/sales' : undefined },
    { title: 'Sales Due', value: sales?.total_due, prior: prior?.sales_summary?.total_due, currency: true, icon: 'Receipt', tone: 'orange', href: can('sale.view') || can('sale.view_own') ? '/sales' : undefined },
    { title: 'Net Profit', value: pnl?.net_profit, prior: prior?.finance_pnl?.net_profit, currency: true, icon: 'BarChart', tone: 'green', href: can('finance.view_pl') ? '/reports' : undefined },
    { title: 'Expenses', value: pnl?.expenses, prior: prior?.finance_pnl?.expenses, currency: true, icon: 'CreditCard', tone: 'red', href: can('income.view') && can('expense.view') ? '/money' : undefined },
    { title: 'Purchase', value: purchases?.purchase_count, prior: prior?.purchase_summary?.purchase_count, icon: 'ShoppingBag', tone: 'blue', href: can('purchase.view') ? '/purchases' : undefined },
    { title: 'Purchase Due', value: purchases?.total_due, prior: prior?.purchase_summary?.total_due, currency: true, icon: 'History', tone: 'orange', href: can('purchase.view') ? '/purchases' : undefined },
    { title: 'Low Stock Product', value: stock.data?.low_stock, icon: 'Package', tone: 'orange', href: stock.data ? { pathname: '/stock', params: { filter: 'low' } } : undefined },
    { title: 'Stock Alert', value: stock.data?.out_of_stock, icon: 'TriangleAlert', tone: 'red', href: stock.data ? { pathname: '/stock', params: { filter: 'out' } } : undefined },
  ];
  const columns = fourAcross ? 4 : 2;
  const targetValue = settings.data?.find((row) => row.key === KEYS.target)?.value;
  const target = typeof targetValue === 'string' || typeof targetValue === 'number' ? Number(targetValue) : 0;
  const actual = todaySales.data?.sales_summary?.revenue;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.canvas }}>
      {shell ? null : <HomeSidebar width={sidebarWidth} branded />}
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border }}>
          <ThemedText type="bodyMedium" style={{ flex: 1 }}>Dashboard</ThemedText>
          <ThemedText type="small" literal numberOfLines={1} style={{ flexShrink: 1 }}>{me?.active_branch?.name ?? me?.organization.name}</ThemedText>
          {can('notification.view') ? <Tap accessibilityRole="button" accessibilityLabel={t('Notifications')} onPress={() => router.push('/notifications')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="Bell" size={20} color={theme.textSecondary} /></Tap> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="heading" literal>{t('Welcome, {name}', { name: me?.full_name?.trim().split(/\s+/)[0] || me?.organization.name || 'SortPi' })} 👋</ThemedText>
              <ThemedText type="small" themeColor="textMuted">Here’s what’s happening with your business today.</ThemedText>
            </View>
            <Tap accessibilityRole="button" accessibilityLabel={dateLabel} onPress={() => { setFrom(range?.from_date ?? ''); setTo(range?.to_date ?? ''); setFilterOpen(true); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
              <Icon name="History" size={17} color={theme.textSecondary} />
              <ThemedText type="smallMedium" literal>{dateLabel}</ThemedText>
              <Icon name="ChevronDown" size={16} color={theme.textSecondary} />
            </Tap>
          </View>

          {base.isError ? <Panel title="Could not load the dashboard." action="Try again" onPress={() => void base.refetch()} /> : null}
          <View style={{ gap: 12 }}>
            {Array.from({ length: cards.length / columns }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 12 }}>
                {cards.slice(row * columns, (row + 1) * columns).map((card) => {
                  const tone = TONES[card.tone];
                  const href = card.href;
                  const previousValue = Number(card.prior);
                  const change = card.value == null || !previousValue ? undefined : (Number(card.value) - previousValue) / Math.abs(previousValue) * 100;
                  return (
                    <Tap key={card.title} accessibilityRole={href ? 'button' : undefined} disabled={!href} onPress={href ? () => router.push(href) : undefined} style={{ flex: 1, minWidth: 0, minHeight: 104, overflow: 'hidden', padding: 12, gap: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.card }}>
                      <View style={{ position: 'absolute', top: 0, start: 0, width: '18%', height: 3, backgroundColor: tone.ink }} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: tone.fill }}>
                          <Icon name={card.icon} size={21} color={tone.ink} />
                        </View>
                        <ThemedText type="smallMedium" style={{ flex: 1 }}>{card.title}</ThemedText>
                      </View>
                      <ThemedText type="heading" numberOfLines={1} adjustsFontSizeToFit>{card.currency ? money(card.value) : card.value ?? '—'}</ThemedText>
                      <ThemedText type="caption" themeColor="textMuted">{change == null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)}% ${t('vs previous period')}`}</ThemedText>
                    </Tap>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: fourAcross ? 'row' : 'column', gap: 12 }}>
            {can('report.sales') ? <SalesChart branch={branch} scope={scope} /> : null}
            {can('customer.view') ? <CustomerPanel summary={customers.data} loading={customers.isPending} error={customers.isError} /> : null}
          </View>

          <View style={{ flexDirection: fourAcross ? 'row' : 'column', gap: 12 }}>
            <Panel title="Top Selling Products" action={can('report.sales') ? 'See all' : undefined} onPress={() => router.push('/reports')}>
              <Rows rows={top.data?.map((r) => ({ key: r.variant_id, label: r.product_name, value: String(Number(r.quantity_sold)) }))} loading={top.isLoading} />
            </Panel>
            <Panel title="Low Stock Product" action={stock.data ? 'See all' : undefined} onPress={() => router.push({ pathname: '/stock', params: { filter: 'low' } })}>
              <Rows rows={low.data?.map((r) => ({ key: r.id, label: r.product_name, value: String(Number(r.available)) }))} loading={low.isLoading} />
            </Panel>
            <Panel title="Top Customers" action={can('customer.view') ? 'See all' : undefined} onPress={() => router.push('/customers')}>
              <Rows rows={ranked.data?.slice(0, 3).map((r, i) => ({ key: r.customer_id ?? String(i), label: r.customer_name, value: money(r.paid) }))} loading={ranked.isLoading} />
            </Panel>
            <Panel title="Today’s Target">
              <ThemedText type="heading">{money(actual)}</ThemedText>
              {target > 0 ? (
                <>
                  <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${Math.min(100, Math.max(0, Number(actual ?? 0) / target * 100))}%`, backgroundColor: theme.brand }} />
                  </View>
                  <ThemedText type="small" themeColor="textMuted">{money(target)}</ThemedText>
                </>
              ) : <ThemedText type="small" themeColor="textMuted">{settings.data ? 'No target set' : '—'}</ThemedText>}
            </Panel>
          </View>

          {can('sale.view') || can('sale.view_own') ? (
            <Panel title="Recent Activities" action="See all" onPress={() => router.push('/sales')}>
              {activity.isError ? <Button title="Try again" variant="secondary" onPress={() => void activity.refetch()} /> : (
                <ActivityTable rows={activity.data} loading={activity.isLoading} />
              )}
            </Panel>
          ) : null}
        </ScrollView>
      </View>
      <BottomSheet visible={filterOpen} title="Date range" onClose={() => setFilterOpen(false)}>
        <View style={{ paddingHorizontal: 16 }}>
          {RANGES.map((option) => (
            <Tap key={option} accessibilityRole="button" accessibilityState={{ selected: !custom && option === preset }} onPress={() => { setPreset(option); setCustom(undefined); setFilterOpen(false); }} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: !custom && option === preset ? theme.brandSoft : theme.card }}>
              <ThemedText type="bodyMedium">{option}</ThemedText>
            </Tap>
          ))}
          <View style={{ gap: 8, marginTop: 12 }}>
            <ThemedText type="bodyMedium">Custom range</ThemedText>
            <Field label="From date" placeholder="YYYY-MM-DD" value={from} onChangeText={setFrom} autoCapitalize="none" />
            <Field label="To date" placeholder="YYYY-MM-DD" value={to} onChangeText={setTo} autoCapitalize="none" />
            <Button title="Apply" disabled={!validDate(from) || !validDate(to) || from > to} onPress={() => { setCustom({ from_date: from, to_date: to }); setFilterOpen(false); }} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function Panel({ title, action, onPress, children, weight = 1 }: { title: string; action?: string; onPress?: () => void; children?: ReactNode; weight?: number }) {
  const theme = useTheme();
  return (
    <Card style={{ flex: weight, minWidth: 0, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ThemedText type="bodyMedium" style={{ flex: 1 }}>{title}</ThemedText>
        {action ? <Tap accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 }}><ThemedText type="smallMedium" style={{ color: theme.brandText }}>{action}</ThemedText></Tap> : null}
      </View>
      {children}
    </Card>
  );
}

function Rows({ rows, loading }: { rows?: { key: string; label: string; detail?: string; value: string; onPress?: () => void }[]; loading: boolean }) {
  const theme = useTheme();
  if (loading) return <SkeletonRows count={2} />;
  if (!rows?.length) return <ThemedText type="small" themeColor="textMuted">{rows ? 'No results' : '—'}</ThemedText>;
  return rows.map((row) => (
    <Tap key={row.key} disabled={!row.onPress} accessibilityRole={row.onPress ? 'button' : undefined} onPress={row.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderTopWidth: 1, borderColor: theme.border }}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallMedium" literal numberOfLines={2}>{row.label}</ThemedText>
        {row.detail ? <ThemedText type="caption" themeColor="textMuted" literal>{row.detail}</ThemedText> : null}
      </View>
      <ThemedText type="smallMedium" literal>{row.value}</ThemedText>
    </Tap>
  ));
}

const ACTIVITY_COLUMNS = [
  ['Order ID', 106], ['Name', 130], ['Date', 106], ['Total Item', 80], ['Payment Method', 132], ['Payment Amount', 133], ['Status', 92], ['Action', 60],
] as const;

function ActivityTable({ rows, loading }: { rows?: Awaited<ReturnType<typeof dashboardActivity>>; loading: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  if (loading) return <SkeletonRows count={2} />;
  if (!rows?.length) return <ThemedText type="small" themeColor="textMuted">No sales in this period.</ThemedText>;

  return (
    <ScrollView horizontal>
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: theme.canvas }}>
          {ACTIVITY_COLUMNS.map(([label, width]) => <ThemedText key={label} type="smallMedium" style={{ width, padding: 8 }}>{label}</ThemedText>)}
        </View>
        {rows.map((sale, index) => {
          const status = sale.status === 'CANCELLED' ? 'Cancelled' : Number(sale.due_amount) > 0 ? 'Pending' : 'Paid';
          const methods = sale.payments?.map((payment) => t(payment.payment_method.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())));
          const values = [sale.invoice_number, sale.customer_name || t('Walk-in customer'), new Date(sale.sale_date).toLocaleDateString(), sale.items?.length ?? '—', methods?.join(', ') || '—', money(sale.grand_total), t(status)];
          return (
            <Tap key={sale.id} accessibilityRole="button" accessibilityLabel={sale.invoice_number} onPress={() => router.push({ pathname: '/sale/[id]', params: { id: sale.id } })} style={{ flexDirection: 'row', minHeight: 48, alignItems: 'center', backgroundColor: index % 2 ? theme.canvas : theme.card }}>
              {values.map((value, i) => <ThemedText key={ACTIVITY_COLUMNS[i][0]} type="small" literal numberOfLines={1} style={{ width: ACTIVITY_COLUMNS[i][1], paddingHorizontal: 8 }}>{value}</ThemedText>)}
              <View style={{ width: ACTIVITY_COLUMNS[7][1], alignItems: 'center' }}><Icon name="ArrowUpRight" size={17} color={theme.brandText} /></View>
            </Tap>
          );
        })}
      </View>
    </ScrollView>
  );
}

type Summary = Awaited<ReturnType<typeof customerSummary>> & { new_today?: number };

function CustomerPanel({ summary, loading, error }: { summary?: Summary; loading: boolean; error: boolean }) {
  const router = useRouter();
  const theme = useTheme();
  const before = summary ? summary.total_customers - summary.new_this_month : 0;
  const growth = summary && before > 0 ? summary.new_this_month / before : undefined;
  const fill = summary?.total_customers ? Math.min(15, Math.round((growth ?? 1) * 15)) : 0;
  const tiles = [
    { label: 'Total Customers', value: summary?.total_customers },
    { label: 'New Customers', value: summary?.new_this_month },
    { label: 'Today Customers', value: summary?.new_today },
  ];
  return (
    <Panel title="Customers Information" action="See all" onPress={() => router.push('/customers')}>
      {loading ? <SkeletonRows count={2} /> : error ? <ThemedText type="small">Could not load customers.</ThemedText> : (
        <>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {tiles.map((tile) => <View key={tile.label} style={{ flex: 1, padding: 8, gap: 4, backgroundColor: theme.canvas, borderRadius: 6 }}><ThemedText type="caption" themeColor="textMuted">{tile.label}</ThemedText><ThemedText type="heading">{tile.value ?? '—'}</ThemedText></View>)}
          </View>
          <Svg width="100%" height={105} viewBox="0 0 200 100" accessible={false}>
            {Array.from({ length: 15 }, (_, i) => {
              const start = Math.PI * (1 - (i + 0.10) / 15);
              const end = Math.PI * (1 - (i + 0.90) / 15);
              return <Path key={i} d={`M ${100 + 80 * Math.cos(start)} ${94 - 80 * Math.sin(start)} A 80 80 0 0 1 ${100 + 80 * Math.cos(end)} ${94 - 80 * Math.sin(end)}`} fill="none" stroke={i < fill ? theme.brand : theme.border} strokeWidth={18} />;
            })}
          </Svg>
          <ThemedText type="smallMedium" style={{ textAlign: 'center' }}>{growth == null ? '—' : `${Math.round(growth * 100)}%`}</ThemedText>
        </>
      )}
    </Panel>
  );
}

const CHART_RANGES = [
  { title: 'Last 7 days', days: 7 },
  { title: 'Last 30 days', days: 30 },
  { title: 'Last 6 months', months: 6 },
  { title: 'Last 12 months', months: 12 },
] as const;

function SalesChart({ branch, scope }: { branch?: string; scope: readonly (string | undefined)[] }) {
  const theme = useTheme();
  const [index, setIndex] = useState(3);
  const [picking, setPicking] = useState(false);
  const option = CHART_RANGES[index];
  const now = new Date();
  const monthly = 'months' in option;
  const count = monthly ? option.months : option.days;
  const periods = Array.from({ length: count }, (_, i) => monthly
    ? new Date(now.getFullYear(), now.getMonth() - count + 1 + i, 1)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + i));
  const range = { from_date: localDateISO(periods[0]), to_date: localDateISO(now) };
  const sales = useQuery({ queryKey: ['home', 'tablet', ...scope, 'sales-days', range], queryFn: () => dashboardSalesDays(branch, range), retry: false, staleTime: 30_000 });
  const totals = useQuery({ queryKey: ['home', 'tablet', ...scope, 'bundle', range], queryFn: () => dashboardBundle(branch, range), retry: false, staleTime: 30_000 });
  const bars = periods.map((date) => {
    const key = localDateISO(date).slice(0, monthly ? 7 : 10);
    const days = sales.data?.filter((row) => (row.date ?? row.day)?.startsWith(key)) ?? [];
    return {
      key,
      label: date.toLocaleDateString(undefined, monthly ? { month: 'short' } : { day: 'numeric' }),
      sales: days.reduce((sum, row) => sum + Number(row.revenue), 0),
      profit: days.reduce((sum, row) => sum + Number(row.gross_profit ?? 0), 0),
      expenses: days.reduce((sum, row) => sum + Number(row.expenses ?? 0), 0),
    };
  });
  const top = Math.max(1, ...bars.map((row) => Math.max(row.sales, row.profit)));
  const floor = Math.max(0, ...bars.map((row) => Math.max(-row.profit, 0) + row.expenses));
  const scale = 148 / (top + floor);
  return (
    <Panel title="Sales Summary" action={option.title} onPress={() => setPicking(true)} weight={1.5}>
      <View style={{ gap: 4 }}>
        <ThemedText type="caption" themeColor="textMuted">Net Profit</ThemedText>
        <ThemedText type="heading">{money(totals.data?.finance_pnl?.net_profit)}</ThemedText>
      </View>
      {sales.isPending ? <SkeletonRows count={3} /> : sales.isError ? <Button title="Try again" variant="secondary" onPress={() => void sales.refetch()} /> : (
        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {bars.map((row) => {
              const profit = Math.max(row.profit, 0);
              return (
                <View key={row.key} accessible accessibilityLabel={`${row.label}, ${money(row.sales)}`} style={{ flex: 1 }}>
                  <View style={{ height: top * scale, justifyContent: 'flex-end', borderBottomWidth: 1, borderColor: theme.border }}>
                    <View style={{ height: Math.max(row.sales - profit, 0) * scale, backgroundColor: '#2563eb' }} />
                    <View style={{ height: profit * scale, backgroundColor: '#1c4ab0' }} />
                  </View>
                  <View style={{ height: floor * scale }}>
                    <View style={{ height: Math.max(-row.profit, 0) * scale, backgroundColor: '#1c4ab0' }} />
                    <View style={{ height: row.expenses * scale, backgroundColor: theme.textMuted }} />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {bars.map((row, i) => <ThemedText key={row.key} type="caption" themeColor="textMuted" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{i % Math.ceil(count / 7) === 0 ? row.label : ''}</ThemedText>)}
          </View>
        </View>
      )}
      <BottomSheet visible={picking} title="Date range" onClose={() => setPicking(false)}>
        <View style={{ paddingHorizontal: 16 }}>
          {CHART_RANGES.map((choice, i) => (
            <Tap key={choice.title} accessibilityRole="button" accessibilityState={{ selected: i === index }} onPress={() => { setIndex(i); setPicking(false); }} style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: i === index ? theme.brandSoft : theme.card }}>
              <ThemedText type="bodyMedium">{choice.title}</ThemedText>
            </Tap>
          ))}
        </View>
      </BottomSheet>
    </Panel>
  );
}
