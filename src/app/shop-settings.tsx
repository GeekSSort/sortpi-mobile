import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { getCompany, listCoupons, listUnitRows, resolvedSettings, saveSetting } from '@/settings/api';
import { checkPercent, checkTarget, describeSettingsError, KEYS, readShop, type Resolved, type SettingKey, type Shop } from '@/settings/logic';
import { readPoints } from '@/settings/points';
import { Pill } from '@/products/variant-card';
import { showToast } from '@/ui/toast';

type Tone = 'good' | 'warn' | 'info';
type NumberKey = 'vat' | 'maxDiscount' | 'target';
const RESOLVED = ['settings', 'resolved'];

/** The settings a shop owner needs most: tax, discount, daily target, how customers pay, and a few rules about selling and stock. Each change is saved as it is made. */
export default function ShopSettingsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('settings.view');
  const canEdit = perms.includes('settings.update');
  const q = useQuery({ queryKey: RESOLVED, queryFn: resolvedSettings, enabled: canSee });
  const units = useQuery({ queryKey: ['settings', 'units'], queryFn: listUnitRows, enabled: canSee && perms.includes('unit.view') });
  const company = useQuery({ queryKey: ['settings', 'company'], queryFn: getCompany, enabled: canSee });
  const coupons = useQuery({ queryKey: ['settings', 'coupons'], queryFn: listCoupons, enabled: canSee });
  const [editing, setEditing] = useState<NumberKey | null>(null);
  const shop = q.data ? readShop(q.data) : null;

  /** A switch saves at once, shows the new state straight away, and goes back with a message if the server refuses. */
  const flip = useMutation({
    mutationFn: (v: { key: SettingKey; on: boolean }) => saveSetting(v.key, v.on ? 'true' : 'false'),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: RESOLVED });
      const before = queryClient.getQueryData<Resolved[]>(RESOLVED);
      queryClient.setQueryData<Resolved[]>(RESOLVED, (rows) => rows?.map((r) => (r.key === v.key ? { ...r, value: v.on } : r)));
      return { before };
    },
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Saved') });
    },
    onError: (e, _v, ctx) => {
      haptics.warning();
      queryClient.setQueryData(RESOLVED, ctx?.before);
      showToast({ text: t(describeSettingsError(e)) });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }

  const own = (k: string) => !!shop?.ownHere.includes(k);
  const lockedNote = () => showToast({ text: t('This branch has its own setting. Change it on the computer.') });
  const confirmFlip = (key: SettingKey, on: boolean, title: string, body: string) =>
    Alert.alert(t(title), t(body), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, change it'), onPress: () => flip.mutate({ key, on }) }]);

  const toggle = (key: SettingKey, icon: IconName, tone: Tone, title: string, hint: string, on: boolean, ask?: { title: string; body: string }) => (
    <SwitchRow key={key} icon={icon} tone={tone} title={title} hint={hint} on={on} locked={own(key)} disabled={!canEdit || flip.isPending} onLocked={lockedNote} onChange={(next) => (ask ? confirmFlip(key, next, ask.title, ask.body) : flip.mutate({ key, on: next }))} />
  );
  const activeUnit = shop?.activeUnit ? units.data?.find((u) => u.id === shop.activeUnit) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Shop settings') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {!canEdit || q.isError ? (
          <View style={{ gap: Spacing.three, padding: Spacing.three }}>
            {!canEdit ? <Notice kind="info">You can look at these, but only the owner can change them.</Notice> : null}
            {q.isError ? <ErrorState message={t('Could not load your settings.')} onRetry={() => void q.refetch()} /> : null}
          </View>
        ) : null}
        {!shop ? (
          q.isPending ? <SkeletonRows /> : null
        ) : (
          <>
            <Section title="Your shop" />
            <ValueRow icon="Store" tone="info" title="Shop details" hint="Name, phone, tax number and address on your bills." value={company.data?.name ?? ''} onPress={() => router.push('/company')} />
            <ValueRow icon="Ticket" tone="good" title="Coupons" hint="Codes you give customers to take something off the bill." value={coupons.data ? t('{n} coupons', { n: coupons.data.length }) : ''} onPress={() => router.push('/coupons')} />

            <Section title="Prices and tax" />
            <ValueRow icon="Percent" tone="good" title="Default VAT" hint="Added to every sale unless a supervisor changes it for one sale." value={`${shop.vat}%`} locked={own(KEYS.vat)} onPress={canEdit ? () => (own(KEYS.vat) ? lockedNote() : setEditing('vat')) : undefined} />
            {toggle(KEYS.vatIncluded, 'Receipt', 'good', 'Shelf prices already include VAT', shop.vatIncluded ? 'The price on the shelf already has VAT in it.' : 'VAT is added on top of the price at the till.', shop.vatIncluded, { title: 'Change how VAT is worked out?', body: 'This changes the total of every new sale. Old sales stay as they were.' })}
            <ValueRow icon="Tag" tone="warn" title="Biggest discount allowed" hint="A cashier cannot give more than this at the till." value={`${shop.maxDiscount}%`} locked={own(KEYS.maxDiscount)} onPress={canEdit ? () => (own(KEYS.maxDiscount) ? lockedNote() : setEditing('maxDiscount')) : undefined} />
            <ValueRow icon="Flag" tone="good" title="Daily sales target" hint="What you hope to sell in a day. Home measures today against it." value={shop.target ? formatBDT(shop.target, { dp: 0 }) : t('Not set')} locked={own(KEYS.target)} onPress={canEdit ? () => (own(KEYS.target) ? lockedNote() : setEditing('target')) : undefined} />

            <Section title="Getting paid" />
            <ValueRow icon="CreditCard" tone="info" title="Ways to pay" hint="Cash is always there. These are the other ways a customer can pay." value={t('{n} ways', { n: shop.methods.length })} onPress={() => router.push('/payment-methods')} />
            <ValueRow icon="Gift" tone="good" title="Customer points" hint="Customers earn points on what they buy and spend them at the till." value={readPoints(q.data ?? []).enabled ? t('On') : t('Off')} onPress={() => router.push('/points')} />
            {toggle(KEYS.partial, 'Users', 'info', 'Allow part payment', 'A customer can pay less than the bill. The rest is written on their account.', shop.partial)}
            {toggle(KEYS.roundWhole, 'Cash', 'info', 'Round the bill to a whole taka', '৳100.40 becomes ৳101, and ৳100.39 becomes ৳100.', shop.roundWhole)}
            {toggle(KEYS.refundPaid, 'Undo', 'info', 'Give money back only on paid bills', 'If a bill is not paid yet, collect the money first, then take the goods back.', shop.refundPaid)}

            <Section title="Stock" />
            {toggle(KEYS.negativeStock, 'TriangleAlert', 'warn', 'Allow selling more than is in stock', shop.negativeStock ? 'The till sells anyway and the count goes below zero until the next delivery.' : 'The till will not sell more than the shelf holds.', shop.negativeStock, { title: 'Change this?', body: 'It decides whether the till may sell goods that are not in stock.' })}
            {toggle(KEYS.barcodes, 'ScanLine', 'info', 'Use barcodes', 'Turn this off if you do not put barcodes on your items. Nothing is lost.', shop.barcodes)}
            {perms.includes('unit.view') ? <ValueRow icon="Ruler" tone="info" title="Stock types" hint="Piece, kilogram, litre. Decides if you can sell half of something." value={activeUnit ? activeUnit.name : units.data ? t('{n} types', { n: units.data.length }) : ''} onPress={() => router.push('/stock-types')} /> : null}
          </>
        )}
      </ScrollView>
      {editing && shop ? <NumberSheet key={editing} what={editing} shop={shop} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function Section({ title }: { title: string }) {
  return (
    <View style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.two }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        {title}
      </ThemedText>
    </View>
  );
}

function useToneStyle() {
  const theme = useTheme();
  return (tone: Tone) => (tone === 'good' ? { fg: theme.success, soft: theme.successSoft } : tone === 'warn' ? { fg: theme.warning, soft: theme.warningSoft } : { fg: theme.brandText, soft: theme.brandSoft });
}

function RowShell({ icon, tone, title, hint, locked, children, onPress }: { icon: IconName; tone: Tone; title: string; hint: string; locked?: boolean; children?: React.ReactNode; onPress?: () => void }) {
  const theme = useTheme();
  const look = useToneStyle()(tone);
  const { t } = usePrefs();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 14, paddingHorizontal: Spacing.three, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: look.soft }}>
        <Icon name={icon} size={20} color={look.fg} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="bodyMedium">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
        {locked ? <Pill icon="Lock" text={t('This branch has its own setting')} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} /> : null}
      </View>
      {children}
    </View>
  );
  return onPress ? (
    <Tap accessibilityRole="button" accessibilityLabel={t(title)} onPress={onPress}>
      {body}
    </Tap>
  ) : (
    body
  );
}

function ValueRow({ icon, tone, title, hint, value, locked, onPress }: { icon: IconName; tone: Tone; title: string; hint: string; value: string; locked?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <RowShell icon={icon} tone={tone} title={title} hint={hint} locked={locked} onPress={onPress}>
      <ThemedText type="bodyMedium" literal style={{ color: theme.textSecondary }}>
        {value}
      </ThemedText>
      {onPress ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
    </RowShell>
  );
}

function SwitchRow({ icon, tone, title, hint, on, locked, disabled, onLocked, onChange }: { icon: IconName; tone: Tone; title: string; hint: string; on: boolean; locked: boolean; disabled: boolean; onLocked: () => void; onChange: (next: boolean) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <RowShell icon={icon} tone={tone} title={title} hint={hint} locked={locked} onPress={locked ? onLocked : undefined}>
      <Switch accessibilityLabel={t(title)} value={on} disabled={disabled || locked} onValueChange={onChange} trackColor={{ true: theme.brand }} thumbColor={on ? theme.onBrand : undefined} />
    </RowShell>
  );
}

const SHEET: Record<NumberKey, { title: string; hint: string; label: string; key: SettingKey; percent: boolean }> = {
  vat: { title: 'Default VAT', hint: 'Added to every sale unless a supervisor changes it for one sale.', label: 'VAT (%)', key: KEYS.vat, percent: true },
  maxDiscount: { title: 'Biggest discount allowed', hint: 'A cashier cannot give more than this at the till. Type 0 to allow none.', label: 'Discount (%)', key: KEYS.maxDiscount, percent: true },
  target: { title: 'Daily sales target', hint: 'What you hope to sell in a day. Leave it empty if you have no target.', label: 'Taka per day', key: KEYS.target, percent: false },
};

function NumberSheet({ what, shop, onClose }: { what: NumberKey; shop: Shop; onClose: () => void }) {
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const spec = SHEET[what];
  const [text, setText] = useState(shop[what]);
  const [problem, setProblem] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (value: string) => saveSetting(spec.key, value),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Saved') });
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    },
    onError: () => haptics.warning(),
  });
  function submit() {
    const r = spec.percent ? checkPercent(text) : checkTarget(text);
    if ('problem' in r) return setProblem(r.problem);
    setProblem(null);
    save.mutate(r.ok);
  }
  return (
    <BottomSheet visible onClose={() => !save.isPending && onClose()} title={spec.title}>
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <ThemedText type="small" themeColor="textSecondary">
          {spec.hint}
        </ThemedText>
        <Field label={spec.label} value={text} onChangeText={(v) => { setText(v); setProblem(null); save.reset(); }} keyboardType="decimal-pad" prefix={spec.percent ? undefined : '৳'} error={problem ? t(problem) : undefined} autoFocus onSubmitEditing={submit} />
        {save.error ? <Notice>{t(describeSettingsError(save.error))}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={save.isPending} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={save.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}
