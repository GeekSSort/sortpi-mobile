import { useWideLandscape } from '@/hooks/use-wide-landscape';
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
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { formatBDT } from '@/lib/money';
import { getCompany, listCoupons, listUnitRows, resolvedSettings, saveSetting } from '@/settings/api';
import { checkPercent, checkTarget, describeSettingsError, KEYS, readShop, type Resolved, type SettingKey, type Shop } from '@/settings/logic';
import { readPoints } from '@/settings/points';
import { Pill } from '@/products/variant-card';
import { PAPERS } from '@/sell/paper';
import { usePaperPref } from '@/sell/paper-pref';
import { printErrorText, printTestReceipt } from '@/sell/print';
import { androidPosDevice, hasBluetoothPrinting, hasBuiltInPrinterSupport, hasSunmiDiagnostics, listPairedPrinters, loadBluetoothPrinter, loadSunmiPrinterInfo, loadSystemPrinting, setBluetoothPrinter, setSystemPrinting } from '@/sell/device-printer';
import type { PairedDevice } from '@/sell/bluetooth-printer';
import { sunmiPrinterStatus } from '@/sell/printer-status';
import { showToast } from '@/ui/toast';

type Tone = 'good' | 'warn' | 'info';
type NumberKey = 'vat' | 'maxDiscount' | 'target';
const RESOLVED = ['settings', 'resolved'];
const SYSTEM_PRINTING = ['settings', 'system-printing'];
const BLUETOOTH_PRINTER = ['settings', 'bluetooth-printer'];
const IOS = process.env.EXPO_OS === 'ios';
const paperLabel = (width: string) => width === 'a4' ? 'A4' : width.replace('mm', ' mm');

/** The settings a shop owner needs most: tax, discount, daily target, how customers pay, and a few rules about selling and stock. Each change is saved as it is made. */
export default function ShopSettingsScreen() {
  const { readingWidth, wideLandscape } = useWideLandscape();
  const theme = useTheme();
  const { t, setGuideDone } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me, biometricAvailable, biometricEnabled, setBiometricEnabled } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('settings.view');
  const canEdit = perms.includes('settings.update');
  const canSetPaper = canSee || ['sale.create', 'sale.view', 'sale.view_own'].some((permission) => perms.includes(permission));
  const [paper, setPaper] = usePaperPref();
  const [paperOpen, setPaperOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const systemPrinting = useQuery({
    queryKey: SYSTEM_PRINTING,
    queryFn: loadSystemPrinting,
    enabled: canSetPaper && hasBuiltInPrinterSupport,
  });
  const sunmiPrinter = useQuery({
    queryKey: ['settings', 'sunmi-printer'],
    queryFn: loadSunmiPrinterInfo,
    enabled: canSetPaper && hasSunmiDiagnostics,
    refetchInterval: 5_000,
  });
  const [btOpen, setBtOpen] = useState(false);
  const [btDevices, setBtDevices] = useState<PairedDevice[] | null>(null);
  const [btError, setBtError] = useState<string | null>(null);
  const bluetoothPrinter = useQuery({
    queryKey: BLUETOOTH_PRINTER,
    queryFn: loadBluetoothPrinter,
    enabled: canSetPaper && hasBluetoothPrinting,
  });
  const openBluetooth = () => {
    setBtOpen(true);
    setBtDevices(null);
    setBtError(null);
    listPairedPrinters().then(setBtDevices).catch((e) => setBtError(printErrorText(e)));
  };
  const chooseBluetooth = (device: PairedDevice | null) => {
    setBtOpen(false);
    setBluetoothPrinter(device ? { name: device.name, address: device.address } : null)
      .then(() => queryClient.setQueryData(BLUETOOTH_PRINTER, device ? { name: device.name, address: device.address } : null))
      .catch(() => showToast({ text: t('Could not save this setting.') }));
  };
  const chooseSystemPrinting = useMutation({
    mutationFn: setSystemPrinting,
    onSuccess: (_, enabled) => queryClient.setQueryData(SYSTEM_PRINTING, enabled),
    onError: () => showToast({ text: t('Could not save this setting.') }),
  });
  const q = useQuery({ queryKey: RESOLVED, queryFn: resolvedSettings, enabled: canSee });
  const units = useQuery({ queryKey: ['settings', 'units'], queryFn: listUnitRows, enabled: canSee && perms.includes('unit.view') });
  const company = useQuery({ queryKey: ['settings', 'company'], queryFn: getCompany, enabled: canSee });
  const coupons = useQuery({ queryKey: ['settings', 'coupons'], queryFn: listCoupons, enabled: canSee });
  const [editing, setEditing] = useState<NumberKey | null>(null);
  const shop = canSee && q.data ? readShop(q.data) : null;

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
      <Stack.Screen options={{ title: t('Settings') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={canSee ? <RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} /> : undefined} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: Math.min(readingWidth, 1080), width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: wideLandscape ? 'row' : 'column', gap: wideLandscape ? Spacing.three : 0, paddingHorizontal: wideLandscape ? Spacing.three : 0 }}>
          <View style={{ flex: wideLandscape ? 1 : undefined, minWidth: 0 }}>
            <Section title="On this device" />
            {canSetPaper && androidPosDevice ? (
              <ValueRow icon="Store" tone="info" title="POS device" hint="Detected from this Android device." value={[androidPosDevice.name, androidPosDevice.model].filter(Boolean).join(' · ')} />
            ) : null}
            {canSetPaper ? (
              <>
                <ValueRow icon="Receipt" tone="info" title="Receipt paper" hint={hasBuiltInPrinterSupport ? "Matches the built-in roll until you choose a size." : "Paper size used when printing receipts from this device."} value={paperLabel(paper)} onPress={() => setPaperOpen(true)} />
                {hasBluetoothPrinting ? (
                  <ValueRow icon="Receipt" tone="info" title="Bluetooth printer" hint={IOS ? 'Print receipts straight to a Bluetooth printer that is switched on near you.' : 'Print receipts straight to a printer you paired in Android Bluetooth settings.'} value={bluetoothPrinter.data?.name ?? t('Not set')} onPress={openBluetooth} />
                ) : null}
                {hasSunmiDiagnostics ? (
                  <ValueRow icon="Receipt" tone="info" title="Built-in printer" hint={[sunmiPrinter.data?.model || 'SUNMI', sunmiPrinter.data?.width && paperLabel(sunmiPrinter.data.width)].filter(Boolean).join(' · ')} value={sunmiPrinter.isPending ? t('Checking…') : t(sunmiPrinterStatus(sunmiPrinter.data?.status))} onPress={() => void sunmiPrinter.refetch()} />
                ) : null}
                {hasBuiltInPrinterSupport ? (
                  <SwitchRow icon="Receipt" tone="info" title="Use Android printing" hint="Open the print dialog to choose an external printer." on={systemPrinting.data === true} locked={false} disabled={systemPrinting.isPending || chooseSystemPrinting.isPending || printing} onLocked={() => undefined} onChange={(enabled) => chooseSystemPrinting.mutate(enabled)} />
                ) : null}
                <ValueRow icon="Receipt" tone="info" title="Print test" hint="Print a sample with the current paper size." value={printing ? t('Opening…') : ''} onPress={printing ? undefined : () => {
                  setPrinting(true);
                  void printTestReceipt().finally(() => {
                    setPrinting(false);
                    if (hasSunmiDiagnostics) void sunmiPrinter.refetch();
                  });
                }} />
              </>
            ) : null}
            {biometricAvailable ? (
              <SwitchRow icon="ScanFace" tone="info" title={process.env.EXPO_OS === 'ios' ? 'Unlock with Face ID' : 'Unlock with fingerprint'} hint="Keeps your shop safe if someone else picks up your phone." on={biometricEnabled} locked={false} disabled={false} onLocked={() => undefined} onChange={(value) => {
                void setBiometricEnabled(value).catch(() => showToast({ text: t('Could not save this setting.') }));
              }} />
            ) : null}
            <ValueRow icon="ChevronRight" tone="info" title="Show the help again" hint="Show the selling guide the next time you open Sell." value="" onPress={() => {
              void setGuideDone(false).then(() => showToast({ text: t('Saved') }));
            }} />
            {canSee && (!canEdit || q.isError) ? (
              <View style={{ gap: Spacing.three, padding: Spacing.three }}>
                {!canEdit ? <Notice kind="info">You can look at these, but only the owner can change them.</Notice> : null}
                {q.isError ? <ErrorState message={t('Could not load your settings.')} onRetry={() => void q.refetch()} /> : null}
              </View>
            ) : null}
            {!shop ? (
              canSee && q.isPending ? <SkeletonRows /> : null
            ) : (
              <>
                <Section title="Your shop" />
                <ValueRow icon="Store" tone="info" title="Shop details" hint="Name, phone, tax number and address on your bills." value={company.data?.name ?? ''} onPress={() => router.push('/company')} />
                <ValueRow icon="Ticket" tone="good" title="Coupons" hint="Codes you give customers to take something off the bill." value={coupons.data ? t('{n} coupons', { n: coupons.data.length }) : ''} onPress={() => router.push('/coupons')} />

              </>
            )}
          </View>
          {shop ? (
            <View style={{ flex: wideLandscape ? 1 : undefined, minWidth: 0 }}>

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
              {toggle(KEYS.negativeStock, 'TriangleAlert', 'warn', 'Allow stock below zero', shop.negativeStock ? 'Goods may be moved or corrected below zero. Sales always go through.' : 'Goods cannot be moved or corrected below zero. Sales still go through, and the Stock tab asks you to count them.', shop.negativeStock, { title: 'Change this?', body: 'It decides whether stock may go below zero when goods are moved or corrected. Sales are never refused for stock.' })}
              {toggle(KEYS.barcodes, 'ScanLine', 'info', 'Use barcodes', 'Turn this off if you do not put barcodes on your items. Nothing is lost.', shop.barcodes)}
              {perms.includes('unit.view') ? <ValueRow icon="Ruler" tone="info" title="Stock types" hint="Piece, kilogram, litre. Decides if you can sell half of something." value={activeUnit ? activeUnit.name : units.data ? t('{n} types', { n: units.data.length }) : ''} onPress={() => router.push('/stock-types')} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
      <BottomSheet visible={paperOpen} onClose={() => setPaperOpen(false)} title="Receipt paper">
        <View style={{ paddingHorizontal: Spacing.three, gap: Spacing.two }}>
          {PAPERS.map(({ width }) => (
            <Tap key={width} accessibilityRole="radio" accessibilityState={{ checked: width === paper }} onPress={() => { void setPaper(width); setPaperOpen(false); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, minHeight: 48, backgroundColor: width === paper ? theme.brandSoft : theme.card }}>
              <ThemedText type="bodyMedium" literal>{paperLabel(width)}</ThemedText>
              {width === paper ? <Icon name="Check" size={20} color={theme.brandText} /> : null}
            </Tap>
          ))}
        </View>
        {androidPosDevice ? <Button title="Use device default" variant="secondary" onPress={() => { void setPaper(null); setPaperOpen(false); }} /> : null}
      </BottomSheet>
      <BottomSheet visible={btOpen} onClose={() => setBtOpen(false)} title="Bluetooth printer">
        <View style={{ paddingHorizontal: Spacing.three, gap: Spacing.two }}>
          {btError ? <Notice kind="info">{btError}</Notice> : null}
          {!btError && btDevices === null ? <ThemedText type="small" themeColor="textSecondary">{IOS ? 'Looking for printers…' : 'Looking for paired printers…'}</ThemedText> : null}
          {!btError && btDevices?.length === 0 ? <Notice kind="info">{IOS ? 'No printers found. Switch the printer on, keep it close to the phone, then open this again.' : 'No paired devices found. Switch the printer on and pair it in Android Bluetooth settings, then open this again.'}</Notice> : null}
          {btDevices?.map((device) => {
            const chosen = device.address === bluetoothPrinter.data?.address;
            return (
              <Tap key={device.address} accessibilityRole="radio" accessibilityState={{ checked: chosen }} onPress={() => chooseBluetooth(device)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, minHeight: 48, backgroundColor: chosen ? theme.brandSoft : theme.card }}>
                <ThemedText type="bodyMedium" literal>{device.name}</ThemedText>
                {chosen ? <Icon name="Check" size={20} color={theme.brandText} /> : null}
              </Tap>
            );
          })}
        </View>
        {bluetoothPrinter.data ? <Button title="Stop using a Bluetooth printer" variant="secondary" onPress={() => chooseBluetooth(null)} /> : null}
      </BottomSheet>
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
