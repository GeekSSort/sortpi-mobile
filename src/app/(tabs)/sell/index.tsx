import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutLeft, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Share, useColorScheme, Vibration, View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { PayColors } from '@/constants/palette';
import { BottomTabInset, Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useT } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';
import { addMoney, compareMoney, formatBDT } from '@/lib/money';
import { Scanner } from '@/scan/scanner';
import { CustomerPicker } from '@/sell/customer-picker';
import { DiscountBlock } from '@/sell/discount-block';
import { totalFromRefusal } from '@/sell/discounts';
import { useDiscounts } from '@/sell/use-discounts';
import { SaleGuide } from '@/sell/sale-guide';
import type { PickedCustomer } from '@/sell/customers';
import { buildPayments, type PayChoice } from '@/sell/payment';
import { receiptText } from '@/sell/receipt';
import { haptics } from '@/lib/haptics';
import { showToast } from '@/ui/toast';
import { amountDue } from '@/customers/logic';
import { salesToday } from '@/home/api';
import { currentShift, dropHeld, listCounters, heldCarts, holdCart, loadSellContext, lookupBarcode, openShift, previewTotal, resumeHeld, sell, type SaleResult } from '@/sell/api';
import { defaultCounter } from '@/sell/counters';
import { holdBody, mergeHeld, type HeldCart } from '@/sell/held';
import { HeldSheet } from '@/sell/held-sheet';
import { addItem, changeDue, changeQuantity, setQuantity, estimateSubtotal, isEmpty, itemCount, lineEstimate, removeLine, type Cart, type CartLine, type PaymentMethod } from '@/sell/cart';
import { SwipeToRemove } from '@/components/swipe-to-remove';
import { useCameraPermissions } from 'expo-camera';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { toCartItem, type CatalogItem } from '@/sell/catalog-map';
import { ItemPicker } from '@/sell/item-picker';
import { takePendingItem } from '@/sell/pending';
import { setBottomBar, useBottomBar } from '@/ui/bottom-bar';
import { describeSellError, LOOKUP_FAILED_TITLE, NOT_IN_CATALOGUE_TITLE, notInCatalogueText } from '@/sell/messages';
import { Tap } from '@/components/tap';

/** Each way of paying has its own colour and picture, so it can be picked without reading: green cash, pink bKash-style mobile, blue card, teal bank. */
const METHODS: { id: PayChoice; label: string; icon: 'Cash' | 'Phone' | 'CreditCard' | 'Bank' }[] = [
  { id: 'CASH', label: 'Cash', icon: 'Cash' },
  { id: 'MOBILE', label: 'Mobile', icon: 'Phone' },
  { id: 'CARD', label: 'Card', icon: 'CreditCard' },
  { id: 'BANK', label: 'Bank', icon: 'Bank' },
];

type Mode = 'scan' | 'pay' | 'done';
/** What the last scan or typed code turned up, when it was not a product. */
type ScanNote = { kind: 'missing'; code: string; scanned: boolean } | { kind: 'failed'; text: string };

export default function SellScreen() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const t = useT();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<Cart>([]);
  const [mode, setMode] = useState<Mode>('scan');
  const [notice, setNotice] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<ScanNote | null>(null);
  // The camera opens by itself only where it is already allowed; otherwise the scan button next to the search box opens it.
  const [cameraPermission] = useCameraPermissions();
  const [cameraChoice, setCameraChoice] = useState<boolean | null>(null);
  const showCamera = cameraChoice ?? !!cameraPermission?.granted;
  const usesBarcodes = useUsesBarcodes();
  const [openingCash, setOpeningCash] = useState('0');
  const [method, setMethod] = useState<PayChoice>('CASH');
  // Most shops are paid the same way every time, so the last way used is the next default.
  useEffect(() => {
    void SecureStore.getItemAsync('sortpi.lastpay').then((m) => m && ['CASH', 'MOBILE', 'CARD', 'BANK'].includes(m) && setMethod(m as PayChoice));
  }, []);
  const [received, setReceived] = useState('');
  const [customer, setCustomer] = useState<PickedCustomer | null>(null); // null = walk-in
  const [picking, setPicking] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [pickedCounter, setPickedCounter] = useState<string | null>(null);
  const [heldBusy, setHeldBusy] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [payNow, setPayNow] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const looking = useRef(false);
  const saleKey = useRef<string | null>(null);

  // A product just added from the not-found card comes back here and goes straight into the cart.
  useFocusEffect(
    useCallback(() => {
      const item = takePendingItem();
      if (item) {
        setCart((c) => addItem(c, item));
        setScanNote(null);
      }
    }, []),
  );

  const userId = me?.id ?? '';
  const [qtyKey, setQtyKey] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState('');
  // Declared before any early return so the hook order never changes. The pay bar shows while there is something to pay for.
  const showBar = mode !== 'done' && !isEmpty(cart);
  const barHeight = useBottomBar();
  // An emptied cart closes its sheet, so the sheet does not pop up again by itself with the next item.
  if (!showBar && cartOpen) setCartOpen(false);
  useEffect(() => {
    if (!showBar) setBottomBar(0);
    return () => setBottomBar(0);
  }, [showBar]);
  const seeSales = ['sale.view', 'sale.view_own'].some((p) => me?.permissions?.includes(p));
  const today = useQuery({ queryKey: ['home', 'today'], queryFn: salesToday, enabled: seeSales && mode === 'done', staleTime: 0, retry: false });
  const ctxQuery = useQuery({ queryKey: ['sell-context', userId, me?.active_branch?.id], queryFn: () => loadSellContext(me!), enabled: !!me });
  const shiftQuery = useQuery({ queryKey: ['shift', userId], queryFn: currentShift, enabled: !!me });
  const baseCtx = ctxQuery.data;
  const counters = useQuery({ queryKey: ['counters', me?.active_branch?.id], queryFn: () => listCounters(me!.active_branch!.id), enabled: !!me?.active_branch?.id && shiftQuery.data === null, staleTime: 0, retry: false });
  const counterList = counters.data ?? [];
  // The counter used last time is chosen again when it is free, so opening the day is usually one tap.
  const lastCounter = useQuery({ queryKey: ['counter-last'], queryFn: () => SecureStore.getItemAsync('sortpi.counter'), staleTime: Infinity });
  const counterId = pickedCounter ?? (counters.data && lastCounter.isSuccess ? defaultCounter(counters.data, lastCounter.data) : null);
  // The named customer replaces the walk-in record; a wholesale customer sells at wholesale prices (the server prices it).
  const ctx = baseCtx ? { ...baseCtx, customerId: customer?.id ?? baseCtx.customerId, wholesale: customer?.wholesale } : undefined;
  const shift = shiftQuery.data;
  const canPickCustomer = me?.permissions?.includes('customer.view') ?? false;
  const canHold = me?.permissions?.includes('pos.hold_sale') ?? false;
  const heldQuery = useQuery({ queryKey: ['held', me?.active_branch?.id], queryFn: heldCarts, enabled: canHold && !!me, staleTime: 15_000 });
  const heldCount = heldQuery.data?.length ?? 0;

  const signature = cart.map((l) => `${l.key}:${l.quantity}`).join(',');
  const previewQuery = useQuery({
    queryKey: ['sell-preview', ctx?.branchId, ctx?.customerId, ctx?.wholesale ?? false, signature],
    queryFn: () => previewTotal(ctx!, cart),
    enabled: !!ctx && !isEmpty(cart),
    staleTime: 0,
    retry: false,
  });
  const serverTotal = previewQuery.data?.grand_total;
  // Coupon, points and whole-taka rounding change what is paid. The server prices the sale again; if it names another total, that one wins.
  const d = useDiscounts({ payable: serverTotal, customerId: customer?.id, active: mode === 'pay', canSettings: me?.permissions?.includes('settings.view') ?? false, canCustomer: canPickCustomer });
  const [forced, setForced] = useState<{ amount: string; sig: string } | null>(null);
  const payTotal = serverTotal ? (forced && forced.sig === d.sig ? forced.amount : (d.totals?.final ?? serverTotal)) : undefined;
  const estimate = estimateSubtotal(cart);

  function removeWithUndo(key: string, name: string) {
    const before = cart;
    setCart((c) => removeLine(c, key));
    showToast({ text: t('Removed {name}', { name }), actionLabel: t('Undo'), onAction: () => setCart(before) });
  }

  /** A tapped item goes in the cart at once; the server prices the whole cart as it always does. */
  function pickItem(item: CatalogItem) {
    setScanNote(null);
    setCart((c) => addItem(c, toCartItem(item)));
    haptics.tap();
  }

  async function onCode(code: string, scanned = true) {
    if (!ctx || looking.current || scanNote || mode !== 'scan') return;
    looking.current = true;
    setScanNote(null);
    try {
      const item = await lookupBarcode(code, ctx.branchId);
      if (item) {
        setCart((c) => addItem(c, item));
        haptics.tap();
      } else {
        setScanNote({ kind: 'missing', code: code.trim(), scanned });
        if (scanned) Vibration.vibrate([0, 80, 60, 80]); // a double buzz for "not found", like the web till's beep
      }
    } catch (e) {
      setScanNote({ kind: 'failed', text: describeSellError(e) });
    } finally {
      looking.current = false;
    }
  }

  async function startShift() {
    if (!ctx) return;
    setBusy(true);
    setNotice(null);
    try {
      const s = await openShift(ctx.branchId, openingCash || '0', counterId);
      if (counterId) void SecureStore.setItemAsync('sortpi.counter', counterId);
      queryClient.setQueryData(['shift', userId], s);
    } catch (e) {
      setNotice(describeSellError(e));
    } finally {
      setBusy(false);
    }
  }

  function startPayment() {
    saleKey.current = newIdempotencyKey(); // one key per payment attempt; reused if the same Confirm is retried
    setForced(null);
    setReceived('');
    setReference('');
    setPayNow('');
    setNotice(null);
    setMode('pay');
  }

  async function confirm() {
    if (!ctx || !shift || !payTotal || !saleKey.current) return;
    const plan = buildPayments({ choice: method, total: payTotal, payNow, reference, hasCustomer: !!customer });
    if (plan.problem) {
      setNotice(plan.problem);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      // The payment is at most what the server says the sale is worth: it refuses an overpayment, and change is not part of the sale.
      const sale = await sell({ ...ctx, shiftId: shift.id, couponCode: d.couponCode, redeemPoints: d.points || undefined }, cart, plan.payments, saleKey.current);
      setResult(sale);
      setMode('done');
      if (method !== 'CREDIT') void SecureStore.setItemAsync('sortpi.lastpay', method);
      haptics.success();
      // Home, Stock and Customers show numbers this sale just changed.
      for (const key of ['setup-count', 'home', 'stock', 'customers']) void queryClient.invalidateQueries({ queryKey: [key] });
    } catch (e) {
      const said = totalFromRefusal(e, plan.payments.reduce((sum, p) => addMoney(sum, p.amount), '0'));
      if (said) {
        // The server's total is not what the phone worked out (rounding, or a rule the phone cannot read). Show it, and charge that.
        setForced({ amount: said, sig: d.sig });
        saleKey.current = newIdempotencyKey();
        setNotice(t('The total is {amount}. Check it, then confirm again.', { amount: formatBDT(said) }));
      } else {
        setNotice(describeSellError(e));
      }
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  /** Put the cart aside for later: it is saved on the server, so any till of this shop can take it back. */
  async function putOnHold() {
    if (!ctx || isEmpty(cart) || busy) return;
    setBusy(true);
    try {
      await holdCart(holdBody({ branchId: ctx.branchId, customerId: customer?.id, wholesale: customer?.wholesale, cart, now: Date.now() }));
      setCart([]);
      setCustomer(null);
      setCartOpen(false);
      void heldQuery.refetch();
      haptics.success();
      showToast({ text: t('Cart put on hold') });
    } catch (e) {
      setNotice(describeSellError(e));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  async function takeBack(h: HeldCart) {
    setHeldBusy(h.id);
    try {
      const got = await resumeHeld(h.id); // the server deletes it as it hands it over
      setCart((c) => mergeHeld(c, got.lines));
      if (got.customerId && !customer && canPickCustomer) setCustomer({ id: got.customerId, name: got.customerName || t('Customer'), phone: '', wholesale: got.wholesale, balance: '0', creditLimit: '0' });
      setHeldOpen(false);
      haptics.tap();
    } catch (e) {
      showToast({ text: describeSellError(e) });
    } finally {
      setHeldBusy(null);
      void heldQuery.refetch();
    }
  }

  async function throwAway(h: HeldCart) {
    setHeldBusy(h.id);
    try {
      await dropHeld(h.id);
    } catch (e) {
      showToast({ text: describeSellError(e) });
    } finally {
      setHeldBusy(null);
      void heldQuery.refetch();
    }
  }

  function newSale() {
    setCart([]);
    setCustomer(null);
    setResult(null);
    setMode('scan');
    setNotice(null);
    saleKey.current = null;
    d.reset();
    setForced(null);
  }

  // ---- states before selling ----
  if (ctxQuery.isPending || shiftQuery.isPending) {
    return (
      <Screen topInset={false}>
        <ThemedText themeColor="textMuted">Getting your till ready…</ThemedText>
      </Screen>
    );
  }
  if (ctxQuery.isError) {
    return (
      <Screen topInset={false}>
        <Notice>{describeSellError(ctxQuery.error)}</Notice>
        <Button title="Try again" onPress={() => void ctxQuery.refetch()} />
      </Screen>
    );
  }
  if (!shift) {
    return (
      <Screen topInset={false}>
        {/* The header link from the selling screen would otherwise stay: there is no day to close yet. */}
        <Stack.Screen options={{ headerRight: () => null }} />
        <Card style={{ gap: 12 }}>
          <ThemedText type="lead">Start selling</ThemedText>
          <ThemedText type="small" themeColor="textMuted">
            How much cash is in your drawer right now? Count it and type it here.
          </ThemedText>
          {counterList.length > 0 ? (
            <View style={{ gap: 8 }}>
              <ThemedText type="smallMedium">Which counter are you at?</ThemedText>
              {counterList.map((c) => {
                const on = counterId === c.id;
                const taken = !!c.inUseBy;
                return (
                  <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on, disabled: taken }} disabled={taken} onPress={() => setPickedCounter(c.id)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 2, borderColor: on ? theme.go : theme.inputBorder, backgroundColor: on ? theme.successSoft : theme.card, opacity: taken ? 0.55 : 1 }}>
                    <Icon name={taken ? 'Lock' : on ? 'Check' : 'Cash'} size={20} color={on ? theme.success : theme.textSecondary} />
                    <ThemedText type="bodyMedium" literal style={{ flex: 1 }}>{c.name}</ThemedText>
                    {taken ? <ThemedText type="caption" themeColor="textMuted">{t('In use by {name}', { name: c.inUseBy ?? '' })}</ThemedText> : null}
                  </Tap>
                );
              })}
            </View>
          ) : null}
          <Field label="Cash in the drawer now" value={openingCash} onChangeText={setOpeningCash} keyboardType="decimal-pad" />
          {notice ? <Notice>{notice}</Notice> : null}
          <Button title="Start selling" loading={busy} disabled={counterList.length > 0 && !counterId} onPress={startShift} />
        </Card>
      </Screen>
    );
  }

  // `received` is free text from the keyboard ("", ".", "12."): only a complete number is compared or used for change.
  const receivedOk = /^\d+(\.\d+)?$/.test(received);
  const cashShort = method === 'CASH' && receivedOk && !!payTotal && compareMoney(received, payTotal) < 0;
  const changeText = method === 'CASH' && receivedOk && !!payTotal && !cashShort ? formatBDT(changeDue(payTotal, received)) : null;

  const totalNote = !serverTotal
    ? previewQuery.isError
      ? 'This price is a guess. We could not check it just now.'
      : 'Checking the price…'
    : previewQuery.data && Number(previewQuery.data.tax_amount) > 0
      ? t('Includes tax {amount}', { amount: formatBDT(previewQuery.data.tax_amount) })
      : null;

  const cartCard = (
        <Card style={{ gap: 4, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 }}>
            <ThemedText type="smallMedium">Cart</ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              {t(itemCount(cart) === 1 ? '1 item' : '{n} items', { n: itemCount(cart) })}
            </ThemedText>
          </View>
          {cart.length === 0 ? (
            // Waits for a removed row to finish leaving, so the two never overlap.
            <Animated.View entering={FadeIn.delay(200).duration(200)}>
              <ThemedText type="small" themeColor="textMuted" style={{ padding: 8 }}>
                Tap an item above to add the first one.
              </ThemedText>
            </Animated.View>
          ) : null}
          {cart.map((l) => (
            <Animated.View key={l.key} entering={FadeInDown.duration(220)} exiting={busy ? undefined : FadeOutLeft.duration(180)} layout={LinearTransition} style={{ borderTopWidth: 1, borderTopColor: theme.border }}>
              <SwipeToRemove onRemove={() => removeWithUndo(l.key, l.name)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, backgroundColor: theme.card }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallMedium" numberOfLines={2}>
                  {l.name}
                  {l.unitLabel ? ` (${l.unitLabel})` : ''}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {Number(l.quantity) === 1 ? formatBDT(lineEstimate(l)) : t('{price} each · {total}', { price: formatBDT(l.unitPrice), total: formatBDT(lineEstimate(l)) })}
                </ThemedText>
              </View>
              {mode === 'scan' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Stepper icon="Minus" label={t('Fewer {name}', { name: l.name })} onPress={() => setCart((c) => changeQuantity(c, l.key, l.allowDecimal ? -0.5 : -1))} />
                  <Tap accessibilityRole="button" accessibilityLabel={t('Change the amount of {name}', { name: l.name })} onPress={() => { setQtyKey(l.key); setQtyText(String(Number(l.quantity))); }} hitSlop={4} style={{ overflow: 'hidden', minWidth: 48, height: 40, paddingHorizontal: 8, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Pop value={l.quantity}>
                      <ThemedText type="bodyMedium" style={{ textAlign: 'center' }}>
                        {Number(l.quantity)}
                        {l.allowDecimal && l.unitShort ? <ThemedText type="caption" themeColor="textMuted" literal> {l.unitShort}</ThemedText> : null}
                      </ThemedText>
                    </Pop>
                  </Tap>
                  <Stepper icon="Plus" label={t('More {name}', { name: l.name })} onPress={() => setCart((c) => changeQuantity(c, l.key, l.allowDecimal ? 0.5 : 1))} />
                  <Stepper icon="Trash2" label={t('Remove {name}', { name: l.name })} onPress={() => removeWithUndo(l.key, l.name)} />
                </View>
              ) : (
                <ThemedText type="bodyMedium">×{Number(l.quantity)}{l.allowDecimal && l.unitShort ? ` ${l.unitShort}` : ''}</ThemedText>
              )}
              </View>
              </SwipeToRemove>
            </Animated.View>
          ))}
        </Card>
  );
  const customerRow = (
          canPickCustomer ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={() => setPicking(true)} disabled={busy} android_ripple={{ color: theme.backgroundSelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Icon name="Search" size={18} color={theme.brandText} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallMedium" literal>{customer ? customer.name : t('Customer: not saved')}</ThemedText>
                  {customer && amountDue(customer.balance) !== '0.00' ? (
                    <ThemedText type="caption" themeColor="textMuted">
                      {t('Owes {amount}', { amount: formatBDT(amountDue(customer.balance)) })}
                      {customer.wholesale ? ` · ${t('Wholesale prices')}` : ''}
                    </ThemedText>
                  ) : customer?.wholesale ? (
                    <ThemedText type="caption" themeColor="textMuted">Wholesale prices</ThemedText>
                  ) : null}
                </View>
                <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                  {customer ? 'Change' : 'Add customer'}
                </ThemedText>
              </Pressable>
            </>
          ) : null
  );

  return (
    <View style={{ flex: 1 }}>
    <Screen topInset={false} keyboardGap={showBar ? barHeight + 40 : 24}>
      <Stack.Screen options={{ headerRight: mode === 'scan' ? () => <HeaderAction title="Close the day" onPress={() => router.push('/end-shift')} /> : undefined }} />
      <SaleGuide mode={mode} cartEmpty={isEmpty(cart)} usesBarcodes={usesBarcodes} />
      {mode === 'scan' ? (
        <>
          {usesBarcodes && showCamera ? <Scanner onCode={(c) => void onCode(c)} paused={scanNote !== null} /> : null}
          {canHold && heldCount > 0 ? (
            <Tap accessibilityRole="button" accessibilityLabel={t('Carts on hold')} onPress={() => setHeldOpen(true)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: theme.warningSoft, borderWidth: 1, borderColor: theme.warning }}>
              <Icon name="Pause" size={20} color={theme.warning} />
              <ThemedText type="smallMedium" style={{ flex: 1 }}>{t(heldCount === 1 ? '1 cart on hold' : '{n} carts on hold', { n: heldCount })}</ThemedText>
              <ThemedText type="smallMedium" style={{ color: theme.brandText }}>See</ThemedText>
            </Tap>
          ) : null}
          <ItemPicker
            onPick={pickItem}
            qtyOf={(id) => cart.filter((l) => l.variantId === id).reduce((n, l) => n + Number(l.quantity), 0)}
            onCode={(c) => void onCode(c, false)}
            wholesale={!!customer?.wholesale}
            branchId={ctx?.branchId}
            scan={usesBarcodes ? { open: showCamera, toggle: () => setCameraChoice(!showCamera) } : undefined}
          />
        </>
      ) : null}

      <ScanNoteSheet note={mode === 'scan' ? scanNote : null} canAdd={me?.permissions?.includes('product.create') ?? false} onAdd={(code) => { setScanNote(null); router.push({ pathname: '/add-product', params: { code, from: 'sell' } }); }} onDismiss={() => setScanNote(null)} />
      {notice ? <Notice>{notice}</Notice> : null}

      {mode === 'done' && result ? (
        <Card style={{ gap: 10, alignItems: 'center', padding: 24 }}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Check" size={40} color={theme.onBrand} strokeWidth={3} />
          </Animated.View>
          <ThemedText type="heading">Sale complete</ThemedText>
          <Animated.View entering={FadeInUp.delay(180).duration(300)}>
            <ThemedText type="title">{formatBDT(result.grand_total)}</ThemedText>
          </Animated.View>
          <ThemedText type="small" themeColor="textMuted">
            Invoice {result.invoice_number}
          </ThemedText>
          {changeText ? <ThemedText type="bodyMedium">Change: {changeText}</ThemedText> : null}
          {result.loyalty_points_earned ? (
            <ThemedText type="smallMedium" literal style={{ color: theme.success }}>
              {t('{name} earned {n} points', { name: customer?.name ?? '', n: result.loyalty_points_earned })}
            </ThemedText>
          ) : null}
          {/* The high point of the job: say how the day is going, so the finish feels like progress. */}
          {today.data ? (
            <Animated.View entering={FadeInUp.delay(420).duration(300)} style={{ alignSelf: 'stretch', alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.successSoft }}>
              <ThemedText type="smallMedium" style={{ color: theme.success }}>
                {today.data.count <= 1 ? t('First sale today. A good start!') : t('Today so far: {n} sales, {amount}', { n: today.data.count, amount: formatBDT(today.data.total) })}
              </ThemedText>
            </Animated.View>
          ) : null}
          {Number(result.due_amount) > 0 ? (
            <ThemedText type="bodyMedium" style={{ color: theme.danger }}>
              {customer ? t('{amount} left on {name} account', { amount: formatBDT(result.due_amount), name: customer.name }) : t('{amount} left on the account', { amount: formatBDT(result.due_amount) })}
            </ThemedText>
          ) : null}
          <Button
            title="Share receipt"
            variant="secondary"
            onPress={() =>
              void Share.share({
                message: receiptText({
                  shop: me?.organization?.name ?? 'SortPi',
                  invoice: result.invoice_number,
                  customer: customer?.name,
                  lines: cart.map((l) => ({ name: l.name, unitLabel: l.unitLabel, quantity: l.quantity, unitPrice: l.unitPrice, total: lineEstimate(l) })),
                  total: result.grand_total,
                  paid: result.paid_amount,
                  due: result.due_amount,
                }),
              })
            }
            style={{ alignSelf: 'stretch', marginTop: 8 }}
          />
          <Button title="New sale" onPress={newSale} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : mode === 'pay' ? (
        cartCard
      ) : null}

      {mode === 'pay' && !isEmpty(cart) ? (
        <Card style={{ gap: 12 }}>
          {customerRow}

            <View style={{ gap: 12 }}>
              {serverTotal ? <DiscountBlock d={d} total={serverTotal} customerName={customer?.name} /> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {METHODS.map((m) => {
                  const on = method === m.id;
                  const pay = PayColors[m.id as keyof typeof PayColors];
                  const ink = dark ? pay.ink.dark : pay.ink.light;
                  return (
                    <Tap key={m.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setMethod(m.id)} style={{ overflow: 'hidden', flex: 1, minHeight: 72, gap: 4, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? pay.fill : ink, backgroundColor: on ? pay.fill : theme.card }}>
                      <Icon name={m.icon} size={24} color={on ? theme.onBrand : ink} />
                      <ThemedText type="smallMedium" style={{ color: on ? theme.onBrand : ink }}>
                        {m.label}
                      </ThemedText>
                    </Tap>
                  );
                })}
              </View>
              {customer ? (
                <Tap accessibilityRole="button" accessibilityState={{ selected: method === 'CREDIT' }} onPress={() => setMethod(method === 'CREDIT' ? 'CASH' : 'CREDIT')} style={{ overflow: 'hidden', minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: method === 'CREDIT' ? theme.brand : theme.inputBorder, backgroundColor: method === 'CREDIT' ? theme.brandSoft : theme.card }}>
                  <ThemedText type="smallMedium" style={{ color: method === 'CREDIT' ? theme.brandText : theme.textSecondary }}>
                    {t("Pay later (udhar): write it all on {name}'s account", { name: customer.name })}
                  </ThemedText>
                </Tap>
              ) : null}
              {customer && method !== 'CREDIT' ? <Field label="Customer pays now" value={payNow} onChangeText={setPayNow} keyboardType="decimal-pad" prefix="৳" hint="If it is less than the total, the rest is written on their account." /> : null}
              {method === 'CARD' || method === 'BANK' || method === 'MOBILE' ? <Field label="Transaction ID (optional)" value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder="Transaction ID or approval code" /> : null}
              {method === 'CASH' ? (
                <Field label="Cash received (optional)" value={received} onChangeText={setReceived} keyboardType="decimal-pad" hint={changeText ? t('Change to give: {amount}', { amount: changeText }) : 'Enter it to see the change.'} error={cashShort ? 'That is less than the total.' : undefined} />
              ) : null}
              <Button title="Go back" variant="secondary" disabled={busy} onPress={() => setMode('scan')} />
            </View>
        </Card>
      ) : null}
      {showBar ? <View style={{ height: Math.max(124, barHeight + 16) }} /> : null}
    </Screen>
    {/* Stays on screen while the cart scrolls, so paying is one tap away however long the bill is. */}
    {showBar ? (
      <KeyboardStickyView offset={{ closed: 0, opened: BottomTabInset }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Animated.View onLayout={(e) => setBottomBar(e.nativeEvent.layout.height)} entering={FadeInDown.duration(220)} style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border }}>
        {/* A refusal (no stock, over the limit) is also said here: the notice at the top of the page is out of sight once the page is scrolled to Confirm. */}
        {mode === 'pay' && notice ? (
          <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            <Icon name="TriangleAlert" size={18} color={theme.danger} />
            <ThemedText type="smallMedium" literal numberOfLines={3} style={{ flex: 1, color: theme.danger }}>{notice}</ThemedText>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Tap accessibilityRole="button" accessibilityLabel={t('See the cart')} disabled={mode !== 'scan'} onPress={() => setCartOpen(true)} style={{ flex: 1 }}>
          <ThemedText type="caption" themeColor="textMuted">
            {mode === 'scan' ? t(itemCount(cart) === 1 ? 'Total · 1 item · tap to see' : 'Total · {n} items · tap to see', { n: itemCount(cart) }) : t('Total')}
          </ThemedText>
          <ThemedText type="heading">{formatBDT((mode === 'pay' ? payTotal : undefined) ?? serverTotal ?? estimate)}</ThemedText>
          {totalNote ? (
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
              {totalNote}
            </ThemedText>
          ) : null}
        </Tap>
        {mode === 'scan' ? (
          <Button title="Take payment" variant="success" size="lg" disabled={!serverTotal} onPress={startPayment} style={{ minWidth: 168 }} />
        ) : (
          <Button variant="success" title={method === 'CREDIT' ? 'Write on account' : 'Confirm'} size="lg" loading={busy} disabled={!payTotal || cashShort} onPress={confirm} style={{ minWidth: 168 }} />
        )}
        </View>
      </Animated.View>
      </KeyboardStickyView>
    ) : null}
    <BottomSheet visible={cartOpen && mode === 'scan'} onClose={() => setCartOpen(false)} title="Check the cart">
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        {cartCard}
        {/* The customer list is its own sheet, so the cart closes first. */}
        {canPickCustomer ? <Pressable accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={() => { setCartOpen(false); setPicking(true); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="Search" size={18} color={theme.brandText} />
          <ThemedText type="smallMedium" literal style={{ flex: 1 }}>{customer ? customer.name : t('Customer: not saved')}</ThemedText>
          <ThemedText type="smallMedium" style={{ color: theme.brandText }}>{customer ? 'Change' : 'Add customer'}</ThemedText>
        </Pressable> : null}
        <Button title="Take payment" variant="success" size="lg" disabled={!serverTotal} onPress={() => { setCartOpen(false); startPayment(); }} />
        {canHold && !isEmpty(cart) ? <Button title="Put on hold" variant="secondary" loading={busy} onPress={() => void putOnHold()} /> : null}
        {isEmpty(cart) ? null : <Button title="Remove everything" variant="secondary" onPress={() => Alert.alert(t('Remove everything?'), t('This takes every item out of the cart.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, remove'), style: 'destructive', onPress: () => { const before = cart; setCart([]); setCartOpen(false); showToast({ text: t('Cart cleared'), actionLabel: t('Undo'), onAction: () => setCart(before) }); } }])} />}
      </View>
    </BottomSheet>
    {canPickCustomer ? (
      <BottomSheet visible={picking} onClose={() => setPicking(false)} title="Customer">
        <CustomerPicker onPick={setCustomer} onClose={() => setPicking(false)} />
      </BottomSheet>
    ) : null}
    <HeldSheet visible={heldOpen} onClose={() => setHeldOpen(false)} carts={heldQuery.data} failed={heldQuery.isError} busyId={heldBusy} onTake={(h) => void takeBack(h)} onDrop={(h) => void throwAway(h)} onRetry={() => void heldQuery.refetch()} />
    <QuantitySheet
      line={cart.find((l) => l.key === qtyKey) ?? null}
      text={qtyText}
      onText={setQtyText}
      onClose={() => setQtyKey(null)}
      onSet={(q) => {
        if (qtyKey) setCart((c) => setQuantity(c, qtyKey, q));
        setQtyKey(null);
      }}
    />
    </View>
  );
}

const QUICK_WHOLE = ['1', '2', '5', '10'];
const QUICK_PARTS = ['0.5', '1', '2', '5'];

/** Pick a common amount in one tap (½, 1, 2, 5), or type any amount. Items sold by weight may be rung in parts. */
function QuantitySheet({ line, text, onText, onClose, onSet }: { line: CartLine | null; text: string; onText: (v: string) => void; onClose: () => void; onSet: (q: string) => void }) {
  const theme = useTheme();
  const t = useT();
  const parts = !!line?.allowDecimal;
  const ok = parts ? /^\d+(\.\d{1,3})?$/.test(text) : /^\d+$/.test(text);
  const unit = line?.allowDecimal && line.unitShort ? ` ${line.unitShort}` : '';
  return (
    <BottomSheet visible={!!line} onClose={onClose} title={line ? line.name : ''}>
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        <ThemedText type="small" themeColor="textSecondary">
          How many?
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(parts ? QUICK_PARTS : QUICK_WHOLE).map((q) => (
            <Pressable key={q} accessibilityRole="button" onPress={() => onSet(q)} android_ripple={{ color: theme.backgroundSelected }} style={{ flex: 1, minHeight: 56, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.brandSoftBorder }}>
              <ThemedText type="lead" style={{ color: theme.brandText }}>
                {q}
                {unit}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Field label="Or type the amount" value={text} onChangeText={onText} keyboardType={parts ? 'decimal-pad' : 'number-pad'} hint={!ok && text ? (parts ? 'Use numbers, like 1.5' : t('One item cannot be sold in parts. Use a whole number.')) : undefined} />
        <Button title="Done" disabled={!ok || Number(text) <= 0} onPress={() => onSet(text)} />
      </View>
    </BottomSheet>
  );
}

/** The quantity jumps up a little and settles when it changes, so a scan that adds one to a line is noticed. */
function Pop({ value, children }: { value: string; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = 1.3;
    scale.value = withSpring(1, { damping: 8, stiffness: 260 });
  }, [value, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function Stepper({ icon, label, onPress }: { icon: 'Minus' | 'Plus' | 'Trash2'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? theme.backgroundSelected : 'transparent' })}>
      <Icon name={icon} size={16} color={icon === 'Trash2' ? theme.danger : theme.textSecondary} />
    </Pressable>
  );
}

/**
 * What a scan turned up when it was not a product, as a popup over the till. It used to sit under the item list, out of sight,
 * so a shopkeeper who scanned an unknown packet saw nothing happen. A missing code is an invitation to add it, so the button leads.
 */
function ScanNoteSheet({ note, canAdd, onAdd, onDismiss }: { note: ScanNote | null; canAdd: boolean; onAdd: (code: string) => void; onDismiss: () => void }) {
  const theme = useTheme();
  const t = useT();
  // Keep the last note while the sheet slides away, so it does not go blank on the way out.
  const [shown, setShown] = useState<ScanNote | null>(note);
  if (note && note !== shown) setShown(note);
  const n = note ?? shown;
  const missing = n?.kind === 'missing';
  return (
    <BottomSheet visible={note !== null} onClose={onDismiss} title={missing ? NOT_IN_CATALOGUE_TITLE : LOOKUP_FAILED_TITLE}>
      {n ? (
        <View accessibilityRole="alert" style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: missing ? theme.dangerSoft : theme.warningSoft }}>
              <Icon name="ScanLine" size={20} color={missing ? theme.danger : theme.warning} />
            </View>
            <ThemedText type="body" themeColor="textSecondary" style={{ flex: 1 }}>
              {n.kind === 'missing' ? (({ text, vars }) => t(text, vars))(notInCatalogueText(n.scanned, n.code)) : n.text}
            </ThemedText>
          </View>
          {n.kind === 'missing' ? (
            <>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.md, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText selectable literal style={{ fontFamily: Fonts?.mono, fontSize: 18, letterSpacing: 1, color: theme.text }}>
                  {n.code}
                </ThemedText>
              </View>
              {canAdd ? (
                <Button title="Add this product" size="lg" onPress={() => onAdd(n.code)} trailing={<Icon name="Plus" size={20} color={theme.onBrand} />} />
              ) : (
                <ThemedText type="small" themeColor="textMuted" style={{ textAlign: 'center' }}>
                  Ask your manager to add it.
                </ThemedText>
              )}
            </>
          ) : null}
          <Button title="Not now" variant="secondary" onPress={onDismiss} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
