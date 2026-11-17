import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutLeft, LinearTransition, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Pressable, ScrollView, Share, useColorScheme, useWindowDimensions, View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { track } from '@/lib/analytics';
import { timed } from '@/lib/perf';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { PayColors, WebPos } from '@/constants/palette';
import { BottomTabInset, Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useT } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';
import { addMoney, compareMoney, formatBDT, subMoney } from '@/lib/money';
import { Scanner } from '@/scan/scanner';
import { useScanFeedback } from '@/scan/use-scan-feedback';
import { searchCatalog } from '@/sell/catalog';
import { useTillDevice } from '@/sell/till-device';
import { useFavoriteProducts, type Favorite } from '@/sell/use-favorite-products';
import { setTillFocus, useTillFocus } from '@/ui/till-focus';
import { CustomerPicker } from '@/sell/customer-picker';
import { DiscountBlock } from '@/sell/discount-block';
import { totalFromRefusal } from '@/sell/discounts';
import { useDiscounts } from '@/sell/use-discounts';
import { SaleGuide } from '@/sell/sale-guide';
import type { PickedCustomer } from '@/sell/customers';
import { amountDueNow, buildPayments, quickCashOffers, walletReference, WALLETS, type PayChoice } from '@/sell/payment';
import { SplitPaySheet } from '@/sell/split-pay';
import { GiftCardPay } from '@/sell/gift-card-pay';
import { SerialEntry } from '@/sell/serial-entry';
import { checkSerials, dealSerials, serialsNeeded } from '@/sell/serials';
import { useGiftCardOffered } from '@/sell/use-gift-offer';
import { clearDraft, clearPending, loadDraft, loadPending, saveDraft, savePending } from '@/sell/journal-store';
import { mayHaveCommitted, type PendingSale } from '@/sell/journal';
import { printErrorText, printReceipt } from '@/sell/print';
import { CashSheet } from '@/sell/cash-sheet';
import { listSales } from '@/sales/api';
import { androidPosDevice } from '@/sell/device-printer';
import { sunmiHandheldScanHint, useSunmiCustomerDisplay, useSunmiScanner } from '@/sell/use-sunmi-peripherals';
import { receiptText } from '@/sell/receipt';
import { haptics } from '@/lib/haptics';
import { showToast } from '@/ui/toast';
import { amountDue } from '@/customers/logic';
import { salesToday } from '@/home/api';
import { currentShift, dropHeld, listCounters, heldCarts, holdCart, loadSellContext, lookupBarcode, lookupCode, nextInvoiceNumber, openShift, previewTotal, resumeHeld, sell, type SaleResult } from '@/sell/api';
import { defaultCounter } from '@/sell/counters';
import { holdBody, holdReference, mergeHeld, type HeldCart } from '@/sell/held';
import { HeldSheet } from '@/sell/held-sheet';
import { addItem, linePriceProblem, lineDiscountProblem, setLineDiscount, setLinePrice, shippingProblem, changeDue, discountProblem, changeQuantity, setQuantity, estimateSubtotal, isEmpty, itemCount, lastQuantity, lineEstimate, lineKey, removeLine, type Cart, type OrderDiscount, type CartLine, type PaymentInput, type ScannedItem } from '@/sell/cart';
import { SwipeToRemove } from '@/components/swipe-to-remove';
import { useCameraPermissions } from 'expo-camera';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { toCartItem, type CatalogItem } from '@/sell/catalog-map';
import { ItemPicker } from '@/sell/item-picker';
import { takePendingItem } from '@/sell/pending';
import { setBottomBar, useBottomBar } from '@/ui/bottom-bar';
import { ApiError } from '@/api/client';
import { describeSellError, LOOKUP_FAILED_TITLE, NOT_IN_CATALOGUE_TITLE, notInCatalogueText } from '@/sell/messages';
import { Tap } from '@/components/tap';
import { TABLET_LAYOUTS, validTillQuantity, type TabletLayout } from '@/sell/tablet-layout';
import { TabletOrderSheet } from '@/sell/tablet-order-sheet';
import { BillingSummary, ExpressBar, ExpressDetails, CouponBox, ShippingBox, QuickActionsDrawer, QuickActionsPanel, QuickActionsRail, SaleOptions, StripButtons, WallCheckout, WallOrderPanel, linesAndItems, WebInvoiceTable, WebOrderColumn, WebPaymentStrip, WebToolbar, type QuickAction, type StripButton, type ToolbarTile } from '@/sell/web-sheet';
import { useOffline } from '@/ui/connection';
import { useShellSidebarWidth } from '@/hooks/use-desktop-shell';
import { useTabletLayout } from '@/sell/use-tablet-layout';

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

/** The clock, read when a sale or a hold is recorded (in an event handler, never while drawing the screen). */
const nowMs = (): number => Date.now();

export default function SellScreen() {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const t = useT();
  const queryClient = useQueryClient();
  const { me, beforeTillLock, clearTillResume } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<Cart>([]);
  const [mode, setMode] = useState<Mode>('scan');
  const { width, height } = useWindowDimensions();
  const focus = useTillFocus() && width >= 720 && width > height;
  const focusExit = focus ? () => <HeaderAction title="Exit focus mode" onPress={() => setTillFocus(false)} /> : undefined;
  const { scannerMode } = useTillDevice();
  const scanFeedback = useScanFeedback();
  const favorites = useFavoriteProducts(me?.organization.id, me?.active_branch?.id);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const wideTill = Platform.OS === 'android' && width >= 720;
  const splitTill = wideTill && mode !== 'done';
  const tablet = useTabletLayout(wideTill);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sheetEditingKey, setSheetEditingKey] = useState<string | null>(null);
  const [lastItemKey, setLastItemKey] = useState<string | null>(null);
  const sheetTill = splitTill && tablet.layout === 'sheet';
  // The wide spreadsheet till is drawn like the web's: toolbar, invoice table, payment strip and billing summary.
  const shellWidth = useShellSidebarWidth();
  const webSheet = sheetTill && width - shellWidth >= 960 && mode === 'scan'; // the room beside the open menu, not the whole screen
  const webTouch = splitTill && tablet.layout === 'touch' && width - shellWidth >= 1200 && mode === 'scan'; // categories, products, order and billing side by side
  const webExpress = splitTill && tablet.layout === 'express' && width - shellWidth >= 1000 && mode === 'scan';
  const webWall = splitTill && tablet.layout === 'wall' && width - shellWidth >= 1250 && mode === 'scan'; // the web's rail, product wall and order
  const [wallCategory, setWallCategory] = useState<{ id: string; name: string } | null>(null);
  const webPanel = webSheet || webTouch || webExpress || webWall; // a web-style till is on screen
  const [discountFocus, setDiscountFocus] = useState(0);
  const [shipping, setShipping] = useState(''); // delivery charged on top, as typed
  const [cashOpen, setCashOpen] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<OrderDiscount | null>(null);
  const [priceMode, setPriceMode] = useState<boolean | null>(null); // wholesale prices chosen on the till, over what the customer has
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitPlan, setSplitPlan] = useState<{ payments: PaymentInput[]; due: string } | null>(null);
  const quickGo = useRef(false); // Quick Pay was tapped: confirm as soon as the payment screen has its total
  const [actionsOpen, setActionsOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(0);
  const offline = useOffline();
  const invoiceBesideProducts = sheetTill && width >= 960;
  const orderPaneWidth = Math.min(500, Math.round(width * 0.47));
  const expressTill = splitTill && tablet.layout === 'express';
  const [notice, setNotice] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<ScanNote | null>(null);
  // An item scanned a second time waits here for a yes, so a camera that lingers on one packet cannot add it twice by accident.
  const [again, setAgain] = useState<ScannedItem | null>(null);
  const [printing, setPrinting] = useState(false);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  // Keep the catalogue in view on wide tills and compact Android POS terminals unless camera scanning is selected.
  const [cameraPermission] = useCameraPermissions();
  const [cameraChoice, setCameraChoice] = useState<{ mode: typeof scannerMode; open: boolean }>();
  const showCamera = cameraChoice?.mode === scannerMode ? cameraChoice.open
    : !!cameraPermission?.granted && (scannerMode === 'auto' || (scannerMode === 'device' && !splitTill && !androidPosDevice));
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
  const giftOffered = useGiftCardOffered();
  const [serialText, setSerialText] = useState<Record<string, string>>({}); // what was typed for each serial-numbered item
  const needSerials = serialsNeeded(cart);
  const [giftBalance, setGiftBalance] = useState<string | null>(null); // what the server said is left on the typed card
  const [payNow, setPayNow] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const looking = useRef(false);
  // The sale that was sent but not answered (or not yet confirmed), kept on the phone so it can be sent again with the SAME key.
  const [pending, setPending] = useState<PendingSale | null>(null);
  const [hidePending, setHidePending] = useState(false);
  const [ready, setReady] = useState(false); // the unfinished sale and the saved cart have been looked for
  const holdTry = useRef<{ reference: string; unanswered: boolean } | null>(null); // one hold may be tried more than once
  const [wallet, setWallet] = useState<string | null>(null);
  useEffect(() => {
    void SecureStore.getItemAsync('sortpi.wallet').then((w) => w && (WALLETS as readonly string[]).includes(w) && setWallet(w));
  }, []);

  // A product just added from the not-found card comes back here and goes straight into the cart.
  useFocusEffect(
    useCallback(() => {
      clearTillResume();
      const item = takePendingItem();
      if (item) {
        setCart((c) => addItem(c, item));
        setScanNote(null);
      }
    }, [clearTillResume]),
  );

  const userId = me?.id ?? '';
  const [qtyKey, setQtyKey] = useState<string | null>(null);
  const [qtyText, setQtyText] = useState('');
  // Declared before any early return so the hook order never changes. The pay bar shows while there is something to pay for.
  const showBar = !splitTill && mode !== 'done' && !isEmpty(cart);
  const barHeight = useBottomBar();
  // An emptied cart closes its sheet, so the sheet does not pop up again by itself with the next item.
  if (!showBar && cartOpen) setCartOpen(false);
  useEffect(() => {
    if (!showBar) setBottomBar(0);
    return () => setBottomBar(0);
  }, [showBar]);
  const seeSales = ['sale.view', 'sale.view_own'].some((p) => me?.permissions?.includes(p));
  const today = useQuery({ queryKey: ['home', 'today'], queryFn: salesToday, enabled: seeSales && mode === 'done', staleTime: 0, retry: false });
  // Where this till sells from (the branch's warehouse and the walk-in customer) takes two to five calls and does not change while the app is open: keep it half an hour.
  const ctxQuery = useQuery({ queryKey: ['sell-context', userId, me?.active_branch?.id], queryFn: () => loadSellContext(me!), enabled: !!me, staleTime: 30 * 60_000 });
  const shiftQuery = useQuery({ queryKey: ['shift', userId], queryFn: currentShift, enabled: !!me });
  const baseCtx = ctxQuery.data;
  // On opening the till: an unfinished sale comes first, else the cart that was on screen before a lock, a call or a kill.
  const draftBranch = baseCtx?.branchId;
  useEffect(() => {
    if (!userId || !draftBranch || ready) return;
    let live = true;
    void (async () => {
      const p = await loadPending(userId);
      if (!live) return;
      if (p) setPending(p);
      else {
        const draft = await loadDraft(userId, draftBranch);
        if (live && draft) {
          setCart((c) => (c.length ? c : draft.cart));
          if (draft.customer) setCustomer((c) => c ?? draft.customer);
        }
      }
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [userId, draftBranch, ready]);
  // The cart on screen is kept on the phone, so nothing is lost if the app is closed or locked in the middle of a sale.
  useEffect(() => {
    if (!ready || !userId || !draftBranch || mode === 'done') return;
    const id = setTimeout(() => {
      if (isEmpty(cart)) {
        if (!pending) void clearDraft();
      } else void saveDraft({ v: 1, at: nowMs(), userId, branchId: draftBranch, cart, customer });
    }, 400);
    return () => clearTimeout(id);
  }, [cart, customer, mode, ready, userId, draftBranch, pending]);
  useEffect(() => beforeTillLock(async () => {
    if (busy || looking.current || sheetEditingKey) throw new Error('Till busy');
    if (!ready || !userId || !draftBranch || mode === 'done') return;
    if (!isEmpty(cart)) await saveDraft({ v: 1, at: nowMs(), userId, branchId: draftBranch, cart, customer }, true);
    else if (!pending) await clearDraft(true);
  }), [beforeTillLock, busy, sheetEditingKey, ready, userId, draftBranch, mode, cart, customer, pending]);
  const counters = useQuery({ queryKey: ['counters', me?.active_branch?.id], queryFn: () => listCounters(me!.active_branch!.id), enabled: !!me?.active_branch?.id && shiftQuery.data === null, staleTime: 0, retry: false });
  const counterList = counters.data ?? [];
  // The counter used last time is chosen again when it is free, so opening the day is usually one tap.
  const lastCounter = useQuery({ queryKey: ['counter-last'], queryFn: () => SecureStore.getItemAsync('sortpi.counter'), staleTime: Infinity });
  const counterId = pickedCounter ?? (counters.data && lastCounter.isSuccess ? defaultCounter(counters.data, lastCounter.data) : null);
  const shipText = shipping.trim();
  const shipError = shipText ? shippingProblem(shipText) : null;
  const shipAmount = shipText && !shipError ? shipText : undefined;
  // The named customer replaces the walk-in record; a wholesale customer sells at wholesale prices (the server prices it).
  const ctx = baseCtx ? { ...baseCtx, customerId: customer?.id ?? baseCtx.customerId, wholesale: priceMode ?? customer?.wholesale, orderDiscount, shipping: shipAmount } : undefined;
  const shift = shiftQuery.data;
  const canPickCustomer = me?.permissions?.includes('customer.view') ?? false;
  const canHold = me?.permissions?.includes('pos.hold_sale') ?? false;
  const heldQuery = useQuery({ queryKey: ['held', me?.active_branch?.id], queryFn: heldCarts, enabled: canHold && !!me, staleTime: 15_000 });
  const heldCount = heldQuery.data?.length ?? 0;

  const signature = cart.map((l) => `${l.key}:${l.quantity}`).join(',');
  const previewQuery = useQuery({
    queryKey: ['sell-preview', ctx?.branchId, ctx?.customerId, ctx?.wholesale ?? false, orderDiscount?.kind, orderDiscount?.value, signature],
    queryFn: () => previewTotal(ctx!, cart),
    enabled: !!ctx && !isEmpty(cart),
    staleTime: 0,
    retry: false,
  });
  const serverTotal = previewQuery.data?.grand_total;
  const invoiceQuery = useQuery({ queryKey: ['next-invoice', ctx?.branchId, result?.id ?? ''], queryFn: () => nextInvoiceNumber(ctx!.branchId), enabled: !!ctx, staleTime: 15_000, retry: false });
  const invoiceNo = invoiceQuery.data ?? '';
  // Coupon, points and whole-taka rounding change what is paid. The server prices the sale again; if it names another total, that one wins.
  const d = useDiscounts({ payable: serverTotal, customerId: customer?.id, active: mode === 'pay' || webPanel, canSettings: me?.permissions?.includes('settings.view') ?? false, canCustomer: canPickCustomer });
  const [forced, setForced] = useState<{ amount: string; sig: string } | null>(null);
  const totalSig = `${d.sig}|${shipAmount ?? ''}`;
  const payTotal = serverTotal ? (forced && forced.sig === totalSig ? forced.amount : addMoney(d.totals?.final ?? serverTotal, shipAmount ?? '0')) : undefined;
  const estimate = estimateSubtotal(cart);
  // How many of each item are in the cart, counted once per change, not once per tile on screen.
  const inCart = new Map<string, number>();
  for (const l of cart) inCart.set(l.variantId, (inCart.get(l.variantId) ?? 0) + Number(l.quantity));

  function removeWithUndo(key: string, name: string) {
    const before = cart;
    setCart((c) => removeLine(c, key));
    showToast({ text: t('Removed {name}', { name }), actionLabel: t('Undo'), onAction: () => setCart(before) });
  }

  function addToOrder(item: ScannedItem, tap = true, quantity = 1) {
    const key = lineKey(item.variantId, item.unitId);
    setLastItemKey(key);
    // "3*milk" rings up three: one is added as usual, then the rest.
    setCart((c) => { const added = addItem(c, item); return quantity > 1 ? changeQuantity(added, key, quantity - 1) : added; });
    if (tap) haptics.tap();
  }

  async function selectTabletLayout(value: TabletLayout | null) {
    try {
      await tablet.choose(value);
      setSheetEditingKey(null);
      setLayoutOpen(false);
    } catch {
      showToast({ text: t('Could not save the POS layout.') });
    }
  }

  /** A tapped item goes in the cart at once; the server prices the whole cart as it always does. */
  function pickItem(item: CatalogItem, quantity = 1) {
    setScanNote(null);
    addToOrder(toCartItem(item), true, quantity);
  }

  function toggleFavorite(item: Favorite) {
    void favorites.toggle(item).catch(() => showToast({ text: t('Could not save the favorite product.') }));
  }

  async function pickFavorite(favorite: Favorite) {
    if (favoriteLoading || !ctx) return;
    setFavoriteLoading(favorite.variantId);
    try {
      const page = await searchCatalog({ q: favorite.sku || favorite.name, page: 1, wholesale: !!customer?.wholesale });
      const item = page.items.find((entry) => entry.variantId === favorite.variantId);
      if (!item) {
        showToast({ text: t('This favorite product is unavailable.') });
        return;
      }
      pickItem(item);
      setFavoritesOpen(false);
    } catch (error) {
      showToast({ text: t(describeSellError(error)) });
    } finally {
      setFavoriteLoading(null);
    }
  }

  async function onCode(code: string, scanned = true, quantity = 1) {
    if (!ctx || looking.current || scanNote || again || mode !== 'scan') return;
    looking.current = true;
    setScanNote(null);
    try {
      const item = await timed('scan_lookup', () => (scanned ? lookupBarcode : lookupCode)(code, ctx.branchId));
      scanFeedback(!!item);
      if (item && scanned && lastQuantity(cartRef.current, item) !== null) {
        setAgain(item);
      } else if (item) {
        addToOrder(item, false, quantity);
      } else {
        setScanNote({ kind: 'missing', code: code.trim(), scanned });
      }
    } catch (e) {
      scanFeedback(false);
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
    // A sale that never got its answer must be finished (or discarded) first: a second sale could double the first.
    if (pending) {
      setHidePending(false);
      return;
    }
    setForced(null);
    setReceived('');
    setReference('');
    setPayNow('');
    setNotice(null);
    setSplitPlan(null);
    setMode('pay');
  }

  /** The sale went through, or its record was replayed: show it and forget the unfinished-sale record. */
  function sold(sale: SaleResult, lines: Cart, how: string, expectedDue: string) {
    setSerialText({});
    setResult(sale);
    track('sale_completed', { items: itemCount(lines), method: how });
    setMode('done');
    haptics.success();
    // The phone's own total (coupon, points, rounding) can differ from the shop's. When the shop's is higher, the difference was NOT taken:
    // say so plainly while the customer is still at the counter, instead of leaving it as a small line on the receipt card.
    if (compareMoney(sale.due_amount, expectedDue) > 0) {
      const short = subMoney(sale.due_amount, expectedDue);
      Alert.alert(t('Check the amount'), t('The shop’s total was {total}, more than the phone showed. {short} was not taken and is left on the account.', { total: formatBDT(sale.grand_total), short: formatBDT(short) }));
    }
    setPending(null);
    void clearPending();
    void clearDraft();
    // Home, Stock and Customers show numbers this sale just changed.
    for (const key of ['setup-count', 'home', 'stock', 'customers']) void queryClient.invalidateQueries({ queryKey: [key] });
  }

  async function confirm() {
    // A request that got no answer is sent again exactly as it was, whatever the screen says now: the server answers with the original sale.
    if (pending) return void finishPending(pending);
    if (!ctx || !shift || !payTotal) return;
    // A phone's IMEI, a device's serial: one per unit, before anything is sent. The server refuses a sale that lacks them.
    const sc = checkSerials(needSerials, serialText);
    if (sc.problem) {
      setNotice(t(sc.problem.text, sc.problem.params));
      return;
    }
    const dealt = dealSerials(cart, sc.serials);
    const plan = splitPlan ? { payments: splitPlan.payments, due: splitPlan.due, problem: null as string | null } : buildPayments({ choice: method, total: payTotal, payNow, reference: method === 'MOBILE' ? walletReference(wallet, reference) : reference, hasCustomer: !!customer, giftBalance: method === 'GIFT_CARD' ? giftBalance : null });
    if (plan.problem) {
      setNotice(plan.problem);
      return;
    }
    const args = { ...ctx, shiftId: shift.id, couponCode: d.couponCode, redeemPoints: d.points || undefined };
    const how = plan.payments.length > 1 ? 'SPLIT' : (plan.payments[0]?.payment_method ?? 'NONE');
    const record: PendingSale = { v: 1, key: newIdempotencyKey(), at: nowMs(), userId, ctx: args, cart, payments: plan.payments, ...(needSerials.length ? { serials: dealt } : {}), total: payTotal, customerName: customer?.name ?? null };
    setBusy(true);
    setNotice(null);
    try {
      await savePending(record).catch(() => undefined); // on the phone BEFORE it is sent
      setPending(record);
      // The payment is at most what the server says the sale is worth: it refuses an overpayment, and change is not part of the sale.
      const sale = await timed('confirm_sale', () => sell(args, cart, plan.payments, record.key, needSerials.length ? dealt : undefined));
      if (method !== 'CREDIT') void SecureStore.setItemAsync('sortpi.lastpay', method);
      if (method === 'MOBILE' && wallet) void SecureStore.setItemAsync('sortpi.wallet', wallet);
      sold(sale, cart, how, plan.due);
    } catch (e) {
      if (mayHaveCommitted(e)) {
        setNotice(describeSellError(e)); // the record stays: Confirm sends the very same sale again
      } else {
        // The shop said no and wrote nothing, so there is nothing to repeat.
        setPending(null);
        void clearPending();
        const said = totalFromRefusal(e, plan.payments.reduce((sum, p) => addMoney(sum, p.amount), '0'));
        if (said) {
          // The server's total is not what the phone worked out (rounding, or a rule the phone cannot read). Show it, and charge that.
          setForced({ amount: said, sig: totalSig });
          setNotice(t('The total is {amount}. Check it, then confirm again.', { amount: formatBDT(said) }));
        } else {
          setNotice(describeSellError(e));
        }
      }
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  /** Send a recorded sale again, with its own key and body. */
  async function finishPending(p: PendingSale) {
    setBusy(true);
    setNotice(null);
    try {
      const sale = await timed('confirm_sale', () => sell(p.ctx, p.cart, p.payments, p.key, p.serials));
      setCart(p.cart);
      sold(sale, p.cart, p.payments.length > 1 ? 'SPLIT' : (p.payments[0]?.payment_method ?? 'NONE'), subMoney(p.total, p.payments.reduce((sum, x) => addMoney(sum, x.amount), '0')));
    } catch (e) {
      if (!mayHaveCommitted(e)) {
        setPending(null);
        void clearPending();
      }
      setNotice(describeSellError(e));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  function discardPending() {
    Alert.alert(t('Throw this sale away?'), t('Only do this if you looked in Sales and it is not there. If it is there, it was already made.'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Throw it away'),
        style: 'destructive',
        onPress: () => {
          setPending(null);
          void clearPending();
        },
      },
    ]);
  }

  /** Put the cart aside for later: it is saved on the server, so any till of this shop can take it back. */
  async function putOnHold() {
    if (!ctx || isEmpty(cart) || busy) return;
    setBusy(true);
    try {
      const attempt = holdTry.current ?? { reference: holdReference(nowMs()), unanswered: false };
      holdTry.current = attempt;
      // A try that got no answer may still have reached the shop: look for it on the list before sending it a second time.
      const already = attempt.unanswered ? (await heldCarts().catch(() => [] as HeldCart[])).some((h) => h.reference === attempt.reference) : false;
      try {
        if (!already) await holdCart(holdBody({ branchId: ctx.branchId, customerId: customer?.id, wholesale: customer?.wholesale, cart, now: nowMs(), reference: attempt.reference }));
      } catch (e) {
        // The shop keeps one cart per reference and says so (400 DUPLICATE_REFERENCE): an earlier try of THIS hold already went through.
        if (!(e instanceof ApiError && e.code === 'DUPLICATE_REFERENCE')) throw e;
      }
      holdTry.current = null;
      setCart([]);
      setCustomer(null);
      setCartOpen(false);
      void heldQuery.refetch();
      haptics.success();
      showToast({ text: t('Cart put on hold') });
    } catch (e) {
      if (holdTry.current) holdTry.current.unanswered = mayHaveCommitted(e);
      if (!mayHaveCommitted(e)) holdTry.current = null;
      setNotice(describeSellError(e));
      haptics.warning();
    } finally {
      setBusy(false);
    }
  }

  async function takeBack(h: HeldCart) {
    setHeldBusy(h.id);
    const before = cart;
    const beforeCustomer = customer;
    // The cart goes on the phone FIRST (the list already carries its lines). The shop deletes it as it hands it over, so a lost answer
    // must not be able to lose it: the lines are already here. The customer comes back too, whatever the person may open in the app.
    setCart(mergeHeld(cart, h.lines));
    if (h.customerId && !customer) setCustomer({ id: h.customerId, name: h.customerName || t('Customer'), phone: '', wholesale: h.wholesale, balance: '0', creditLimit: '0' });
    try {
      await resumeHeld(h.id);
      setHeldOpen(false);
      haptics.tap();
    } catch (e) {
      if (mayHaveCommitted(e)) {
        setHeldOpen(false);
        showToast({ text: t('Your cart is back, but the shop did not confirm it. Look at the held carts before putting it on hold again.') });
      } else {
        // The shop said no (another till took it first): take the lines out again.
        setCart(before);
        setCustomer(beforeCustomer);
        showToast({ text: describeSellError(e) });
      }
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

  // Quick Pay: exact cash, and the sale goes through as soon as the payment screen has its total.
  useEffect(() => {
    if (!quickGo.current || mode !== 'pay' || !payTotal || busy) return;
    quickGo.current = false;
    void confirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, payTotal, busy]);

  function newSale() {
    setCart([]);
    setCustomer(null);
    setResult(null);
    setMode('scan');
    setNotice(null);
    void clearDraft();
    d.reset();
    setForced(null);
    setOrderDiscount(null);
    setPriceMode(null);
    setSplitPlan(null);
    setShipping('');
  }

  const hardwareScannerEnabled = !!ctx && !!shift && ready && usesBarcodes && mode === 'scan'
    && scannerMode !== 'manual' && !cartOpen && !heldOpen && !favoritesOpen && !layoutOpen && !toolsOpen && !busy && !pending;
  const { acceptKeyboardCode, subscribeToBroadcast } = useSunmiScanner(hardwareScannerEnabled, (code) => void onCode(code));
  const customerTotal = pending && mode === 'pay' ? pending.total : ((mode === 'pay' ? payTotal : undefined) ?? serverTotal ?? estimate);
  const displayTotal = formatBDT(customerTotal);
  const digits = formatBDT(customerTotal, { symbol: false }).replace(/,/g, '');
  const segmentTotal = /^\d+(\.\d+)?$/.test(digits) && digits.replace('.', '').length <= 7 ? digits : null;
  const displayTitle = me?.organization.name ?? 'SortPi';
  const displayTotalLabel = t('Total');
  const displayBasket = useMemo(() => ({
    title: displayTitle,
    lines: cart.map((line) => `${line.quantity} × ${line.name}`),
    totalLabel: displayTotalLabel,
    total: displayTotal,
    segmentTotal,
  }), [cart, displayTitle, displayTotalLabel, displayTotal, segmentTotal]);
  useSunmiCustomerDisplay(!!me && !!ctx && !!shift && ready && mode !== 'done', displayBasket);

  // ---- states before selling ----
  if (ctxQuery.isPending || shiftQuery.isPending) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ headerRight: focusExit }} />
        <ThemedText themeColor="textMuted">Getting your till ready…</ThemedText>
      </Screen>
    );
  }
  if (ctxQuery.isError) {
    return (
      <Screen topInset={false}>
        <Stack.Screen options={{ headerRight: focusExit }} />
        <Notice>{describeSellError(ctxQuery.error)}</Notice>
        <Button title="Try again" onPress={() => void ctxQuery.refetch()} />
      </Screen>
    );
  }
  if (!shift) {
    return (
      <Screen topInset={false}>
        {/* The header link from the selling screen would otherwise stay: there is no day to close yet. */}
        <Stack.Screen options={{ headerRight: focusExit }} />
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
  // Cash is judged against what is taken NOW (the whole total, or what a named customer pays now), not the full total.
  const dueNow = payTotal ? amountDueNow(payTotal, payNow, !!customer) : undefined;
  const cashShort = !splitPlan && method === 'CASH' && receivedOk && !!dueNow && compareMoney(received, dueNow) < 0;
  const changeText = method === 'CASH' && receivedOk && !!dueNow && !cashShort ? formatBDT(changeDue(dueNow, received)) : null;

  const totalNote = !serverTotal
    ? previewQuery.isError
      ? previewQuery.error instanceof ApiError && previewQuery.error.code === 'INSUFFICIENT_STOCK'
        ? describeSellError(previewQuery.error)
        : 'This price is a guess. We could not check it just now.'
      : 'Checking the price…'
    : previewQuery.data && Number(previewQuery.data.tax_amount) > 0
      ? t('Includes tax {amount}', { amount: formatBDT(previewQuery.data.tax_amount) })
      : null;

  const cartCard = (
        <Card style={{ gap: 4, padding: 12 }}>
          {!splitTill || mode === 'pay' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 }}>
              <ThemedText type="smallMedium">Cart</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {t(itemCount(cart) === 1 ? '1 item' : '{n} items', { n: itemCount(cart) })}
              </ThemedText>
            </View>
          ) : null}
          {cart.length === 0 ? (
            // Waits for a removed row to finish leaving, so the two never overlap.
            <Animated.View entering={FadeIn.delay(200).duration(200)}>
              <ThemedText type="small" themeColor="textMuted" style={{ padding: 8 }}>
                {splitTill ? t('Tap a product to add it to the cart.') : t('Tap an item above to add the first one.')}
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
                  <Tap accessibilityRole="button" accessibilityLabel={t('Change the amount of {name}', { name: l.name })} onPress={() => { setQtyKey(l.key); setQtyText(String(Number(l.quantity))); }} hitSlop={4} style={{ overflow: 'hidden', minWidth: 48, height: 44, paddingHorizontal: 8, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
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

  const totalSummary = (
    <>
      <ThemedText type="caption" themeColor="textMuted">
        {mode === 'scan' && !splitTill ? t(itemCount(cart) === 1 ? 'Total · 1 item · tap to see' : 'Total · {n} items · tap to see', { n: itemCount(cart) }) : t('Total')}
      </ThemedText>
      <ThemedText type="heading">{formatBDT(pending && mode === 'pay' ? pending.total : ((mode === 'pay' ? payTotal : undefined) ?? serverTotal ?? estimate))}</ThemedText>
      {!isEmpty(cart) && totalNote ? (
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {totalNote}
        </ThemedText>
      ) : null}
    </>
  );

  const cartActions = isEmpty(cart) ? null : (
    <>
      {canHold ? <Button title="Put on hold" variant="secondary" loading={busy} onPress={() => void putOnHold()} /> : null}
      <Button title="Remove everything" variant="secondary" onPress={() => Alert.alert(t('Remove everything?'), t('This takes every item out of the cart.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, remove'), style: 'destructive', onPress: () => { const before = cart; setCart([]); setCartOpen(false); showToast({ text: t('Cart cleared'), actionLabel: t('Undo'), onAction: () => setCart(before) }); } }])} />
    </>
  );

  const paymentPanel = mode === 'pay' && !isEmpty(cart) ? (
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
        <Tap accessibilityRole="button" accessibilityLabel={t('Multiple payment')} onPress={() => setSplitOpen(true)} style={{ overflow: 'hidden', minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: splitPlan ? theme.brand : theme.inputBorder, backgroundColor: splitPlan ? theme.brandSoft : theme.card }}>
          <ThemedText type="smallMedium" style={{ color: splitPlan ? theme.brandText : theme.textSecondary }}>{t('Multiple payment')}</ThemedText>
        </Tap>
        {splitPlan ? (
          <View style={{ gap: 6, padding: 10, borderRadius: Radius.md, backgroundColor: theme.canvas }}>
            {splitPlan.payments.map((x, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ThemedText type="small">{t(METHODS.find((m) => m.id === x.payment_method)?.label ?? x.payment_method)}{x.reference_no ? ` · ${x.reference_no}` : ''}</ThemedText>
                <ThemedText type="smallMedium">{formatBDT(x.amount)}</ThemedText>
              </View>
            ))}
            {compareMoney(splitPlan.due, '0') > 0 ? <ThemedText type="caption" themeColor="textMuted">{t('Left on the account: {amount}', { amount: formatBDT(splitPlan.due) })}</ThemedText> : null}
            <Tap accessibilityRole="button" onPress={() => setSplitPlan(null)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <ThemedText type="smallMedium" style={{ color: theme.brandText }}>{t('Use one way of paying instead')}</ThemedText>
            </Tap>
          </View>
        ) : null}
        <SerialEntry needed={needSerials} typed={serialText} onChange={(id, text) => setSerialText((all) => ({ ...all, [id]: text }))} />
        {!splitPlan && giftOffered ? (
          <Tap accessibilityRole="button" accessibilityState={{ selected: method === 'GIFT_CARD' }} onPress={() => { setMethod(method === 'GIFT_CARD' ? 'CASH' : 'GIFT_CARD'); setReference(''); setGiftBalance(null); }} style={{ overflow: 'hidden', minHeight: 52, flexDirection: 'row', gap: 8, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: method === 'GIFT_CARD' ? PayColors.GIFT_CARD.fill : theme.inputBorder, backgroundColor: method === 'GIFT_CARD' ? PayColors.GIFT_CARD.fill : theme.card }}>
            <Icon name="Gift" size={22} color={method === 'GIFT_CARD' ? theme.onBrand : dark ? PayColors.GIFT_CARD.ink.dark : PayColors.GIFT_CARD.ink.light} />
            <ThemedText type="smallMedium" style={{ color: method === 'GIFT_CARD' ? theme.onBrand : dark ? PayColors.GIFT_CARD.ink.dark : PayColors.GIFT_CARD.ink.light }}>
              Pay with a gift card
            </ThemedText>
          </Tap>
        ) : null}
        {!splitPlan && method === 'GIFT_CARD' ? <GiftCardPay code={reference} onCode={setReference} onBalance={setGiftBalance} /> : null}
        {!splitPlan && customer ? (
          <Tap accessibilityRole="button" accessibilityState={{ selected: method === 'CREDIT' }} onPress={() => setMethod(method === 'CREDIT' ? 'CASH' : 'CREDIT')} style={{ overflow: 'hidden', minHeight: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: method === 'CREDIT' ? theme.brand : theme.inputBorder, backgroundColor: method === 'CREDIT' ? theme.brandSoft : theme.card }}>
            <ThemedText type="smallMedium" style={{ color: method === 'CREDIT' ? theme.brandText : theme.textSecondary }}>
              {t("Pay later (udhar): write it all on {name}'s account", { name: customer.name })}
            </ThemedText>
          </Tap>
        ) : null}
        {!splitPlan && customer && method !== 'CREDIT' ? <Field label="Customer pays now" value={payNow} onChangeText={setPayNow} keyboardType="decimal-pad" prefix="৳" hint="If it is less than the total, the rest is written on their account." /> : null}
        {!splitPlan && method === 'MOBILE' ? (
          <View style={{ gap: 8 }}>
            <ThemedText type="smallMedium" themeColor="textSecondary">
              Which wallet?
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WALLETS.map((w) => {
                const on = wallet === w;
                return (
                  <Tap key={w} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setWallet(on ? null : w)} style={{ minHeight: 48, minWidth: 84, paddingHorizontal: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? theme.go : theme.inputBorder, backgroundColor: on ? theme.successSoft : theme.card }}>
                    <ThemedText type="smallMedium" literal>
                      {w}
                    </ThemedText>
                  </Tap>
                );
              })}
            </View>
          </View>
        ) : null}
        {!splitPlan && (method === 'CARD' || method === 'BANK' || method === 'MOBILE') ? <Field label="Transaction ID (optional)" value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder="Transaction ID or approval code" /> : null}
        {!splitPlan && method === 'CASH' ? (
          <View style={{ gap: 8 }}>
            <Field label="Cash received (optional)" value={received} onChangeText={setReceived} keyboardType="decimal-pad" hint={changeText ? t('Change to give: {amount}', { amount: changeText }) : 'Enter it to see the change.'} error={cashShort ? 'That is less than the total.' : undefined} />
            {payTotal ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {quickCashOffers(payTotal).map((amount, i) => (
                  <Tap key={amount} accessibilityRole="button" accessibilityLabel={i === 0 ? t('Exact amount') : formatBDT(amount)} onPress={() => setReceived(amount)} style={{ minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: received === amount ? theme.brand : theme.border, backgroundColor: received === amount ? theme.brandSoft : theme.card }}>
                    <ThemedText type="smallMedium" literal>{i === 0 ? t('Exact') : formatBDT(amount, { dp: 0 })}</ThemedText>
                  </Tap>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        <Button title="Go back" variant="secondary" disabled={busy || !!pending} onPress={() => setMode('scan')} />
      </View>
    </Card>
  ) : null;

  const paymentStatus = (
    <>
      {/* A refusal (no stock, over the limit) is also said here: the notice at the top of the page is out of sight once the page is scrolled to Confirm. */}
      {mode === 'pay' && pending && !busy ? (
        <ThemedText type="caption" themeColor="textSecondary" style={{ paddingBottom: 8, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          {t('The last try got no answer. Confirm sends the same sale again; it cannot be charged twice.')}
        </ThemedText>
      ) : null}
      {mode === 'pay' && notice ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Icon name="TriangleAlert" size={18} color={theme.danger} />
          <ThemedText type="smallMedium" literal numberOfLines={3} style={{ flex: 1, color: theme.danger }}>{notice}</ThemedText>
        </View>
      ) : null}
    </>
  );

  const activeLayoutTitle = TABLET_LAYOUTS.find((layout) => layout.id === tablet.layout)?.title;
  const orderCount = t(itemCount(cart) === 1 ? '1 item' : '{n} items', { n: itemCount(cart) });
  const lastItem = cart.find((line) => line.key === lastItemKey) ?? cart.at(-1);
  const orderSheet = (
    <TabletOrderSheet cart={cart} onQuantity={(key, value) => setCart((c) => setQuantity(c, key, value))} onRemove={removeWithUndo}
      onEditing={(key, editing) => setSheetEditingKey((current) => editing ? key : current === key ? null : current)} />
  );
  const paymentAction = mode === 'scan' ? (
    <Button title="Take payment" variant="success" size="lg" disabled={isEmpty(cart) || !serverTotal || (sheetTill && cart.some((line) => line.key === sheetEditingKey))} onPress={startPayment} style={{ minWidth: 168 }} />
  ) : (
    <Button variant="success" title={method === 'CREDIT' ? 'Write on account' : 'Confirm'} size="lg" loading={busy} disabled={pending ? false : !payTotal || cashShort} onPress={confirm} style={{ minWidth: 168 }} />
  );

  const headerBar = (
    <Stack.Screen options={{ headerRight: mode === 'scan' ? () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {focusExit?.()}
        {splitTill ? <HeaderAction title="POS layout" icon="Sliders" onPress={() => { Keyboard.dismiss(); setLayoutOpen(true); }} /> : null}
        <HeaderAction title="Till tools" onPress={() => { Keyboard.dismiss(); setToolsOpen(true); }} />
      </View>
    ) : focusExit }} />
  );
  const itemPicker = (webBar: boolean) => (
    <ItemPicker
      acceptKeyboardCode={acceptKeyboardCode}
      subscribeToBroadcast={subscribeToBroadcast}
      layout={splitTill ? tablet.layout : undefined}
      webBar={webBar}
      category={webBar && tablet.layout === 'wall' ? (wallCategory?.id ?? null) : undefined}
      focusSignal={searchFocus}
      favorites={favorites.favorites}
      favoritesBusy={favorites.busy}
      onFavorite={toggleFavorite}
      onPick={pickItem}
      qtyOf={(id) => splitTill && tablet.layout === 'touch'
        ? Number(lastQuantity(cart, { variantId: id, unitId: null }) ?? 0)
        : inCart.get(id) ?? 0}
      onFewer={(item) => setCart((c) => changeQuantity(c, lineKey(item.variantId, null), -1))}
      onCode={(c, q) => void onCode(c, false, q)}
      onEmpty={webBar ? () => payWith(method) : undefined}
      wholesale={!!customer?.wholesale}
      branchId={ctx?.branchId}
      scan={usesBarcodes ? {
        open: showCamera,
        toggle: () => setCameraChoice({ mode: scannerMode, open: !showCamera }),
        preview: showCamera ? <Scanner feedbackHandled height={splitTill ? 160 : 180} onCode={(c) => void onCode(c)} paused={scanNote !== null || again !== null || toolsOpen} /> : undefined,
      } : undefined}
    />
  );
  const overlays = (
    <>
      <UnfinishedSaleSheet pending={mode === 'scan' && !hidePending ? pending : null} busy={busy} onFinish={() => pending && void finishPending(pending)} onLater={() => setHidePending(true)} onDiscard={discardPending} notice={notice} />
      <ScannedAgainSheet item={mode === 'scan' ? again : null} inCart={again ? lastQuantity(cart, again) : null} onYes={() => { if (again) addToOrder(again); setAgain(null); }} onNo={() => setAgain(null)} />
      <ScanNoteSheet note={mode === 'scan' ? scanNote : null} canAdd={me?.permissions?.includes('product.create') ?? false} onAdd={(code) => { setScanNote(null); router.push({ pathname: '/add-product', params: { code, from: 'sell' } }); }} onDismiss={() => setScanNote(null)} />
    </>
  );

  // ---- the web-style spreadsheet till ----
  const needItems = () => showToast({ text: t('Add an item first.') });
  function payWith(m: PayChoice) {
    if (isEmpty(cart) || !serverTotal) return needItems();
    if (m === 'CREDIT' && !customer) return showToast({ text: t('Choose a customer first.') });
    setMethod(m);
    startPayment();
  }
  function resetSale() {
    if (isEmpty(cart)) return needItems();
    Alert.alert(t('Remove everything?'), t('This takes every item out of the cart.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, remove'), style: 'destructive', onPress: () => { const before = cart; setCart([]); showToast({ text: t('Cart cleared'), actionLabel: t('Undo'), onAction: () => setCart(before) }); } }]);
  }
  const can = (p: string) => me?.permissions?.includes(p) ?? false;
  function quickPay() {
    if (isEmpty(cart) || !serverTotal) return needItems();
    setMethod('CASH');
    startPayment();
    quickGo.current = true;
  }
  function multiplePay() {
    if (isEmpty(cart) || !serverTotal) return needItems();
    setMethod('CASH');
    startPayment();
    setSplitOpen(true);
  }
  const applyDiscount = (kind: 'PCT' | 'AMT', typed: string): string | null => {
    const problem = discountProblem(kind, typed);
    if (problem) return problem;
    setOrderDiscount({ kind, value: typed.trim() });
    return null;
  };
  const discountShown = previewQuery.data?.discount_amount && Number(previewQuery.data.discount_amount) > 0 ? formatBDT(previewQuery.data.discount_amount) : undefined;
  const commitLinePrice = (key: string, typed: string) => {
    if (!typed) return setCart((c) => setLinePrice(c, key, null));
    const problem = linePriceProblem(typed);
    if (problem) return showToast({ text: t(problem) });
    setCart((c) => setLinePrice(c, key, typed));
  };
  const commitLineDiscount = (key: string, typed: string) => {
    if (!typed) return setCart((c) => setLineDiscount(c, key, null));
    const line = cart.find((l) => l.key === key);
    const problem = lineDiscountProblem(typed, line ? lineEstimate({ ...line, lineDiscount: undefined }) : '0');
    if (problem) return showToast({ text: t(problem) });
    setCart((c) => setLineDiscount(c, key, typed));
  };
  async function printLast() {
    try {
      const last = (await listSales({ search: '', range: 'all', page: 1 })).rows[0];
      if (!last) return showToast({ text: t('No sale yet.') });
      await printReceipt(last.id, { shopName: me?.organization.name ?? 'SortPi', branchName: me?.active_branch?.name });
    } catch (e) {
      showToast({ text: t(printErrorText(e)) });
    }
  }
  const shippingBox = <ShippingBox value={shipping} onChange={setShipping} problem={shipError} />;
  const saleOptions = can('pos.manual_discount')
    ? <SaleOptions focusSignal={discountFocus} discount={orderDiscount} applied={discountShown} onApply={applyDiscount} onClear={() => setOrderDiscount(null)} extra={<><CouponBox d={d} />{shippingBox}</>} />
    : <View style={{ gap: 10, padding: 10, borderWidth: 1, borderColor: theme.border }}><CouponBox d={d} />{shippingBox}</View>;
  const goHold = () => (isEmpty(cart) ? needItems() : void putOnHold());
  const toolbarTiles: ToolbarTile[] = [
    { key: 'invoices', label: 'Invoices', icon: 'Receipt', color: WebPos.teal, hidden: !seeSales, onPress: () => router.push('/sales') },
    { key: 'refund', label: 'Refund', icon: 'Undo', color: WebPos.pink, hidden: !can('sale.refund'), onPress: () => router.push('/sales') },
    { key: 'hold', label: 'Hold', icon: 'Pause', color: WebPos.amber, hidden: !canHold, onPress: goHold },
    { key: 'held', label: 'Held', badge: String(heldCount), icon: 'History', color: WebPos.violet, hidden: !canHold, onPress: () => setHeldOpen(true) },
    { key: 'cash', label: 'Cash in/out', icon: 'Cash', color: WebPos.yellow, ink: WebPos.ink, hidden: !can('finance.manage_accounts') || !shift, onPress: () => setCashOpen(true) },
    { key: 'report', label: 'Report', icon: 'BarChart', color: WebPos.green, hidden: !can('report.sales'), onPress: () => router.push('/day-report') },
    { key: 'home', label: 'Home', icon: 'Dashboard', color: WebPos.blue, onPress: () => router.navigate('/') },
    { key: 'products', label: 'Products', icon: 'Package', color: WebPos.purple, hidden: !can('product.view'), onPress: () => router.push('/products') },
    { key: 'scanners', label: 'Scanners', icon: 'ScanLine', color: WebPos.cyan, hidden: !usesBarcodes, onPress: () => setCameraChoice({ mode: scannerMode, open: !showCamera }) },
  ];
  const payButtons: StripButton[] = [
    { key: 'cash', label: 'Pay · Cash', color: WebPos.blue, onPress: () => payWith('CASH') },
    { key: 'card', label: 'Eftpos', color: WebPos.orange, onPress: () => payWith('CARD') },
    { key: 'multiple', label: 'Multiple', color: WebPos.slate, onPress: multiplePay },
    { key: 'credit', label: 'Credit', color: WebPos.hotPink, onPress: () => payWith('CREDIT') },
  ];
  const actionButtons: StripButton[] = [
    ...(canHold ? [{ key: 'hold', label: 'Hold', color: '#f97316', onPress: goHold }, { key: 'recall', label: heldCount > 0 ? `Recall (${heldCount})` : 'Recall', color: WebPos.teal, onPress: () => setHeldOpen(true) }] : []),
    { key: 'reset', label: 'Reset', color: WebPos.rose, onPress: resetSale },
    ...(seeSales ? [{ key: 'recent', label: 'Recent', color: WebPos.sky, onPress: () => router.push('/sales') }] : []),
  ];
  const quickActions: QuickAction[] = [
    { key: 'search', label: 'Product Search', icon: 'Search', onPress: () => setSearchFocus((n) => n + 1) },
    { key: 'customer', label: 'Customer', icon: 'Users', hidden: !canPickCustomer, onPress: () => setPicking(true) },
    { key: 'pay', label: 'Payment Method', icon: 'Cash', onPress: () => payWith('CASH') },
    { key: 'hold', label: 'Hold Sale', icon: 'Pause', hidden: !canHold, onPress: goHold },
    { key: 'resume', label: 'Resume', icon: 'History', hidden: !canHold, onPress: () => setHeldOpen(true) },
    { key: 'reset', label: 'Reset Sale', icon: 'Trash2', onPress: resetSale },
    { key: 'browse', label: 'Browse Products', icon: 'Package', hidden: !can('product.view'), onPress: () => router.push('/products') },
    { key: 'price', label: 'Price Check', icon: 'ScanLine', hidden: !can('product.view'), onPress: () => router.push('/price-check') },
    { key: 'fav', label: 'Favorite products', icon: 'Star', onPress: () => setFavoritesOpen(true) },
    { key: 'layout', label: 'POS layout', icon: 'Sliders', onPress: () => setLayoutOpen(true) },
    { key: 'tools', label: 'Till tools', icon: 'Sliders', onPress: () => setToolsOpen(true) },
    { key: 'close', label: 'Day Close', icon: 'Lock', onPress: () => router.push('/end-shift') },
  ];
  const billTotal = formatBDT(addMoney((webPanel ? d.totals?.final : undefined) ?? serverTotal ?? estimate, shipAmount ?? '0'));
  const lineDiscounts = previewQuery.data?.lines?.length === cart.length ? cart.map((_, i) => { const v = previewQuery.data?.lines?.[i]?.discount_amount; return v && Number(v) > 0 ? v : undefined; }) : undefined;
  const couponShown = d.coupon ? formatBDT(d.coupon.discount) : undefined;
  const railSale: QuickAction[] = [
    { key: 'search', label: 'Product search', icon: 'Search', onPress: () => setSearchFocus((n) => n + 1) },
    { key: 'customer', label: 'Customer', icon: 'Users', hidden: !canPickCustomer, onPress: () => setPicking(true) },
    { key: 'pay', label: 'Payment method', icon: 'Cash', onPress: () => payWith('CASH') },
    { key: 'hold', label: 'Hold sale', icon: 'Pause', hidden: !canHold, onPress: goHold },
    { key: 'resume', label: 'Resume', icon: 'History', hidden: !canHold, badge: heldCount > 0 ? String(heldCount) : undefined, onPress: () => setHeldOpen(true) },
    { key: 'discount', label: 'Order discount', icon: 'Percent', hidden: !can('pos.manual_discount'), onPress: () => setDiscountFocus((n) => n + 1) },
    { key: 'reset', label: 'Reset sale', icon: 'Trash2', onPress: resetSale },
    { key: 'browse', label: 'Browse products', icon: 'Package', hidden: !can('product.view'), onPress: () => router.push('/products') },
  ];
  const railTill: QuickAction[] = [
    { key: 'recent', label: 'Recent sales', icon: 'Receipt', hidden: !seeSales, onPress: () => router.push('/sales') },
    { key: 'refund', label: 'Refund', icon: 'Undo', hidden: !can('sale.refund'), onPress: () => router.push('/sales') },
    { key: 'print', label: 'Print last receipt', icon: 'Receipt', hidden: !seeSales, onPress: () => void printLast() },
    { key: 'cashmove', label: 'Cash in/out', icon: 'Cash', hidden: !can('finance.manage_accounts'), onPress: () => setCashOpen(true) },
    { key: 'close', label: 'Day Close', icon: 'Lock', onPress: () => router.push('/end-shift') },
    { key: 'price', label: 'Price Check', icon: 'ScanLine', hidden: !can('product.view'), onPress: () => router.push('/price-check') },
    { key: 'fav', label: 'Favorite products', icon: 'Star', onPress: () => setFavoritesOpen(true) },
    { key: 'layout', label: 'POS layout', icon: 'Sliders', onPress: () => setLayoutOpen(true) },
    { key: 'tools', label: 'Till tools', icon: 'Sliders', onPress: () => setToolsOpen(true) },
  ];
  const showRail = width >= 1400; // room for the web's permanent quick-actions panel
  const webLayout = (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {headerBar}
      <WebToolbar cashier={me?.full_name || me?.email || undefined} shift={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} tiles={toolbarTiles} wholesale={!!ctx?.wholesale} onPriceMode={setPriceMode} online={!offline}
        onRefresh={() => { void queryClient.invalidateQueries(); void heldQuery.refetch(); }} onActions={() => setActionsOpen(true)} onEndShift={() => router.push('/end-shift')} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {showRail ? <View style={{ width: 270, padding: 12, paddingEnd: 0 }}><QuickActionsPanel sale={railSale} till={railTill} /></View> : null}
        <View style={{ flex: 1, minWidth: 0, padding: 12, gap: 10 }}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, maxHeight: 320 }}>{itemPicker(true)}</ScrollView>
          {notice ? <Notice>{notice}</Notice> : null}
          <WebInvoiceTable cart={cart} discounts={lineDiscounts} canPrice={can('pos.price_override')} canDiscount={can('pos.manual_discount')} onPrice={commitLinePrice} onDiscount={commitLineDiscount} onQuantity={(key, value) => setCart((c) => setQuantity(c, key, value))} onRemove={removeWithUndo}
            onEditing={(key, editing) => setSheetEditingKey((current) => editing ? key : current === key ? null : current)} />
          <WebPaymentStrip total={billTotal} pay={payButtons} actions={actionButtons} />
        </View>
        <View style={{ width: 340 }}>
          <BillingSummary invoice={invoiceNo} wholesale={!!ctx?.wholesale} customer={customer?.name ?? null}
            owes={customer && amountDue(customer.balance) !== '0.00' ? t('Owes {amount}', { amount: formatBDT(amountDue(customer.balance)) }) : undefined}
            onCustomer={canPickCustomer ? () => setPicking(true) : undefined} lines={cart.length} items={itemCount(cart)}
            subtotal={formatBDT(previewQuery.data?.subtotal ?? estimate)} discount={discountShown ?? (orderDiscount ? formatBDT('0') : undefined)} tax={previewQuery.data ? formatBDT(previewQuery.data.tax_amount) : undefined}
            coupon={couponShown} shipping={shipAmount ? formatBDT(shipAmount) : undefined} onFind={canPickCustomer ? () => setPicking(true) : undefined} onAdd={can('customer.create') ? () => router.push('/add-customer') : undefined} grand={billTotal} note={!serverTotal && !isEmpty(cart) ? totalNote : null}>{saleOptions}</BillingSummary>
        </View>
      </View>
      {overlays}
    </View>
  );

  const webTouchLayout = (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {headerBar}
      <WebToolbar cashier={me?.full_name || me?.email || undefined} shift={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} tiles={toolbarTiles} wholesale={!!ctx?.wholesale} onPriceMode={setPriceMode} online={!offline}
        onRefresh={() => { void queryClient.invalidateQueries(); void heldQuery.refetch(); }} onActions={() => setActionsOpen(true)} onEndShift={() => router.push('/end-shift')} />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
          {itemPicker(true)}
          {notice ? <Notice>{notice}</Notice> : null}
        </ScrollView>
        <View style={{ width: 300 }}>
          <WebOrderColumn cart={cart} onStep={(key, by) => setCart((c) => changeQuantity(c, key, by))} onRemove={removeWithUndo} onClear={resetSale} />
        </View>
        <View style={{ width: 330 }}>
          <BillingSummary invoice={invoiceNo} wholesale={!!ctx?.wholesale} customer={customer?.name ?? null}
            owes={customer && amountDue(customer.balance) !== '0.00' ? t('Owes {amount}', { amount: formatBDT(amountDue(customer.balance)) }) : undefined}
            onCustomer={canPickCustomer ? () => setPicking(true) : undefined} lines={cart.length} items={itemCount(cart)}
            subtotal={formatBDT(previewQuery.data?.subtotal ?? estimate)} discount={discountShown ?? (orderDiscount ? formatBDT('0') : undefined)} tax={previewQuery.data ? formatBDT(previewQuery.data.tax_amount) : undefined}
            coupon={couponShown} shipping={shipAmount ? formatBDT(shipAmount) : undefined} onFind={canPickCustomer ? () => setPicking(true) : undefined} onAdd={can('customer.create') ? () => router.push('/add-customer') : undefined} grand={billTotal} note={!serverTotal && !isEmpty(cart) ? totalNote : null}
            footer={(
              <>
                <StripButtons columns={2} buttons={payButtons} />
                <Button title={`${t('Place order')} ${billTotal}`} variant="success" size="lg" disabled={isEmpty(cart) || !serverTotal} onPress={() => payWith(method)} />
                <StripButtons buttons={actionButtons} />
              </>
            )} />
        </View>
      </View>
      {overlays}
    </View>
  );

  const expressTiles: ToolbarTile[] = [
    { key: 'home', label: 'Home', icon: 'Dashboard', color: WebPos.blue, onPress: () => router.navigate('/') },
    { key: 'hold', label: 'Hold', icon: 'Pause', color: '#ea580c', hidden: !canHold, onPress: goHold },
    { key: 'shortcut', label: 'Actions', icon: 'Sliders', color: '#7c3aed', onPress: () => setActionsOpen(true) },
    { key: 'back', label: 'Back', icon: 'Undo', color: '#64748b', onPress: () => (router.canGoBack() ? router.back() : router.navigate('/')) },
    { key: 'full', label: 'Full Screen', icon: 'ArrowUpRight', color: '#4f46e5', onPress: () => setTillFocus(true) },
    { key: 'scanner', label: 'Scanner', icon: 'ScanLine', color: '#0ea5e9', hidden: !usesBarcodes, onPress: () => setCameraChoice({ mode: scannerMode, open: !showCamera }) },
    { key: 'layout', label: 'Layout', icon: 'Layers', color: WebPos.blue, onPress: () => setLayoutOpen(true) },
    { key: 'online', label: offline ? 'Offline' : 'Online', icon: offline ? 'WifiOff' : 'Activity', color: offline ? WebPos.red : '#16a34a', onPress: () => void queryClient.invalidateQueries() },
    { key: 'notify', label: 'Notification', icon: 'Bell', color: '#e11d48', hidden: !can('notification.view'), onPress: () => router.push('/notifications') },
  ];
  const webExpressLayout = (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {headerBar}
      <ExpressBar shift={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} tiles={expressTiles} />
      <View style={{ flex: 1, flexDirection: 'row', padding: 10, paddingTop: 0, gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 10, padding: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, maxHeight: 300 }}>{itemPicker(true)}</ScrollView>
          {notice ? <Notice>{notice}</Notice> : null}
          {isEmpty(cart) ? (
            <View style={{ alignItems: 'center', gap: 4, padding: 16, backgroundColor: theme.canvas, borderWidth: 1, borderColor: theme.border }}>
              <ThemedText type="heading">{t('Ready for the next customer')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>{t('Scan the first item. Pin items you sell without a barcode as quick keys.')}</ThemedText>
            </View>
          ) : null}
          <View style={{ flex: 1, borderWidth: 1, borderColor: theme.border }}>
            <WebOrderColumn cart={cart} onStep={(key, by) => setCart((c) => changeQuantity(c, key, by))} onRemove={removeWithUndo} onClear={resetSale} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
            <ThemedText type="small" themeColor="textSecondary">{linesAndItems(t, cart.length, itemCount(cart))}</ThemedText>
            <ThemedText type="heading">{billTotal}</ThemedText>
          </View>
        </View>
        <View style={{ width: 380 }}>
          <ExpressDetails counter={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} onPriceMode={setPriceMode} options={saleOptions} customer={customer?.name ?? null}
            owes={customer && amountDue(customer.balance) !== '0.00' ? t('Owes {amount}', { amount: formatBDT(amountDue(customer.balance)) }) : undefined}
            onCustomer={canPickCustomer ? () => setPicking(true) : undefined} onAddCustomer={can('customer.create') ? () => router.push('/add-customer') : undefined}
            wholesale={!!ctx?.wholesale} lines={cart.length} items={itemCount(cart)} total={billTotal} empty={isEmpty(cart)} onClear={resetSale}
            buttons={{ pay: () => payWith('CASH'), quick: quickPay, credit: () => payWith('CREDIT'), recent: seeSales ? () => router.push('/sales') : undefined, hold: canHold ? goHold : undefined, reset: resetSale }} />
        </View>
      </View>
      {overlays}
    </View>
  );

  const wallButtons = { pay: () => payWith('CASH'), quick: quickPay, credit: () => payWith('CREDIT'), recent: seeSales ? () => router.push('/sales') : undefined, hold: canHold ? goHold : undefined, reset: resetSale };
  const webWallLayout = (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      {headerBar}
      <ExpressBar shift={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} tiles={expressTiles} />
      <View style={{ flex: 1, flexDirection: 'row', padding: 10, paddingTop: 0, gap: 10 }}>
        <View style={{ width: 290 }}>
          <QuickActionsRail actions={quickActions} picked={wallCategory} onPickCategory={setWallCategory} onClearCategory={() => setWallCategory(null)} />
        </View>
        <View style={{ flex: 1, minWidth: 0, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
            {itemPicker(true)}
            {notice ? <Notice>{notice}</Notice> : null}
          </ScrollView>
          <WallCheckout options={saleOptions} items={itemCount(cart)} unique={cart.length} total={billTotal} empty={isEmpty(cart)} buttons={wallButtons} />
        </View>
        <View style={{ width: 400 }}>
          <WallOrderPanel counter={shift?.counter_name ?? me?.active_branch?.name ?? '—'} invoice={invoiceNo} onPriceMode={setPriceMode} customer={customer?.name ?? null}
            owes={customer && amountDue(customer.balance) !== '0.00' ? t('Owes {amount}', { amount: formatBDT(amountDue(customer.balance)) }) : undefined}
            onCustomer={canPickCustomer ? () => setPicking(true) : undefined} onAddCustomer={can('customer.create') ? () => router.push('/add-customer') : undefined}
            wholesale={!!ctx?.wholesale} lines={cart.length} empty={isEmpty(cart)} onClear={resetSale}>
            <WebOrderColumn cart={cart} onStep={(key, by) => setCart((c) => changeQuantity(c, key, by))} onRemove={removeWithUndo} onClear={resetSale} />
          </WallOrderPanel>
        </View>
      </View>
      {overlays}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <View style={{ flex: 1, flexDirection: splitTill ? 'row' : 'column', backgroundColor: theme.canvas }}>
    {webSheet ? webLayout : webTouch ? webTouchLayout : webExpress ? webExpressLayout : webWall ? webWallLayout : (<>
    <Screen topInset={false} keyboardGap={showBar ? barHeight + 40 : 24}>
      {headerBar}
      {mode === 'scan' ? (
        <View style={{ gap: 4 }}>
          <ThemedText type="heading">Products</ThemedText>
          {splitTill && activeLayoutTitle ? <ThemedText type="small" themeColor="textMuted">{activeLayoutTitle}</ThemedText> : null}
        </View>
      ) : splitTill && mode === 'pay' ? <ThemedText type="heading">Review order</ThemedText> : null}
      <SaleGuide mode={mode} cartEmpty={isEmpty(cart)} usesBarcodes={usesBarcodes} />
      {mode === 'scan' ? (
        <>
          {hardwareScannerEnabled && sunmiHandheldScanHint ? (
            <ThemedText type="small" themeColor="textMuted">Use the side button to scan</ThemedText>
          ) : null}
          {itemPicker(false)}
          {sheetTill && !invoiceBesideProducts ? (
            <View style={{ gap: 8 }}>
              <ThemedText type="bodyMedium">Invoice</ThemedText>
              {orderSheet}
            </View>
          ) : null}
        </>
      ) : null}

      {overlays}
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
          <Button title="Print receipt" loading={printing} onPress={() => {
            setPrinting(true);
            void printReceipt(result.id, { shopName: me?.organization.name ?? 'SortPi', branchName: me?.active_branch?.name }).finally(() => setPrinting(false));
          }} style={{ alignSelf: 'stretch', marginTop: 8 }} />
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

      {!splitTill ? paymentPanel : null}
      {showBar ? <View style={{ height: Math.max(124, barHeight + 16) }} /> : null}
    </Screen>
    {splitTill ? (
      <View style={{ width: orderPaneWidth, backgroundColor: theme.canvas, borderStartWidth: 1, borderColor: theme.border }}>
        <View style={{ minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <ThemedText type="bodyMedium">{mode === 'pay' ? 'Payment' : invoiceBesideProducts ? 'Invoice' : 'Current order'}</ThemedText>
          <ThemedText type="small" themeColor="textMuted" literal>{orderCount}</ThemedText>
        </View>
        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={24} contentContainerStyle={{ padding: 12, gap: 12 }}>
          {mode === 'pay' ? paymentPanel : (
            <>
              {customerRow}
              {expressTill ? (
                <Card style={{ gap: 4 }}>
                  <ThemedText type="small" themeColor="textMuted">Last item</ThemedText>
                  <ThemedText type="heading" literal numberOfLines={2}>{lastItem?.name ?? '—'}</ThemedText>
                  {lastItem ? <ThemedText type="bodyMedium">{formatBDT(lastItem.unitPrice)}</ThemedText> : null}
                </Card>
              ) : null}
              {sheetTill ? (invoiceBesideProducts ? orderSheet : null) : cartCard}
              {cartActions}
            </>
          )}
        </KeyboardAwareScrollView>
        <View style={{ padding: 12, gap: 8, backgroundColor: theme.card, borderTopWidth: 1, borderColor: theme.border }}>
          {paymentStatus}
          <View style={{ flexDirection: orderPaneWidth >= 400 ? 'row' : 'column', alignItems: orderPaneWidth >= 400 ? 'center' : 'stretch', gap: 12 }}>
            <View style={orderPaneWidth >= 400 ? { flex: 1 } : undefined}>{totalSummary}</View>
            {paymentAction}
          </View>
        </View>
      </View>
    ) : null}
    </>)}
    </View>
    {/* Stays on screen while the cart scrolls, so paying is one tap away however long the bill is. */}
    {showBar ? (
      <KeyboardStickyView offset={{ closed: 0, opened: BottomTabInset }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <Animated.View onLayout={(e) => setBottomBar(e.nativeEvent.layout.height)} entering={FadeInDown.duration(220)} style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border }}>
        {paymentStatus}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Tap accessibilityRole="button" accessibilityLabel={t('See the cart')} disabled={mode !== 'scan'} onPress={() => setCartOpen(true)} style={{ flex: 1 }}>
          {totalSummary}
        </Tap>
        {paymentAction}
        </View>
      </Animated.View>
      </KeyboardStickyView>
    ) : null}
    <CashSheet visible={cashOpen} shiftId={shift?.id} onClose={() => setCashOpen(false)} onDone={() => { setCashOpen(false); showToast({ text: t('Cash recorded.') }); void queryClient.invalidateQueries({ queryKey: ['shift'] }); }} />
    <SplitPaySheet visible={splitOpen && mode === 'pay'} total={payTotal ?? '0'} hasCustomer={!!customer} onClose={() => setSplitOpen(false)} onUse={(plan) => { setSplitPlan({ payments: plan.payments, due: plan.due }); setSplitOpen(false); }} />
    <QuickActionsDrawer visible={actionsOpen && (webSheet || webTouch || webExpress || webWall)} onClose={() => setActionsOpen(false)} actions={quickActions} />
    <BottomSheet visible={toolsOpen && mode === 'scan'} onClose={() => setToolsOpen(false)} title="Till tools">
      <View style={{ gap: 8, paddingHorizontal: 16 }}>
        {me?.permissions?.includes('product.view') ? <Button title="Price Check" variant="secondary" onPress={() => { setToolsOpen(false); router.push('/price-check'); }} /> : null}
        {me?.permissions?.includes('purchase.view') ? <Button title="Purchase List" variant="secondary" onPress={() => { setToolsOpen(false); router.push('/purchases'); }} /> : null}
        {splitTill && tablet.layout !== 'sheet' ? (
          <Button title="Spreadsheet till" variant="secondary" disabled={tablet.busy} onPress={() => {
            setToolsOpen(false);
            void selectTabletLayout('sheet');
          }} />
        ) : null}
        {canHold ? <Button title={heldCount > 0 ? t('Held carts ({n})', { n: heldCount }) : 'Held carts'} variant="secondary" onPress={() => { setToolsOpen(false); setHeldOpen(true); }} /> : null}
        <Button title="Favorite products" variant="secondary" onPress={() => { setToolsOpen(false); setFavoritesOpen(true); }} />
        <Button title="Day Close" variant="secondary" onPress={() => { setToolsOpen(false); router.push('/end-shift'); }} />
      </View>
    </BottomSheet>
    <BottomSheet visible={layoutOpen && splitTill && mode === 'scan'} onClose={() => setLayoutOpen(false)} title="POS layout">
      <View style={{ gap: 8, paddingHorizontal: 16 }}>
        {TABLET_LAYOUTS.map((layout) => {
          const selected = tablet.layout === layout.id;
          return (
            <Tap key={layout.id} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: tablet.busy }} disabled={tablet.busy} onPress={() => void selectTabletLayout(layout.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56, borderRadius: Radius.md, backgroundColor: selected ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: selected ? theme.brandSoftBorder : theme.border }}>
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText type="bodyMedium">{layout.title}</ThemedText>
                <ThemedText type="small" themeColor="textMuted">{layout.description}</ThemedText>
              </View>
              {selected ? <Icon name="Check" size={20} color={theme.brandText} /> : null}
            </Tap>
          );
        })}
        {tablet.deviceLayout ? <Button title="Use shop default" variant="secondary" disabled={tablet.busy} onPress={() => void selectTabletLayout(null)} /> : null}
      </View>
    </BottomSheet>
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
        {cartActions}
      </View>
    </BottomSheet>
    {canPickCustomer ? (
      <BottomSheet visible={picking} onClose={() => setPicking(false)} title="Customer">
        <CustomerPicker onPick={setCustomer} onClose={() => setPicking(false)} />
      </BottomSheet>
    ) : null}
    <BottomSheet visible={favoritesOpen && mode === 'scan'} title="Favorite products" onClose={() => { if (!favoriteLoading) setFavoritesOpen(false); }}>
      <View style={{ gap: 8, paddingHorizontal: 16 }}>
        {favorites.favorites.length === 0 ? <ThemedText type="small" themeColor="textMuted">Tap the star on a product to save it here.</ThemedText> : null}
        {favorites.favorites.map((item) => (
          <View key={item.variantId} style={{ flexDirection: 'row', gap: 8 }}>
            <Button title={item.name} variant="secondary" loading={favoriteLoading === item.variantId} disabled={!!favoriteLoading} onPress={() => void pickFavorite(item)} style={{ flex: 1 }} />
            <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name} from favorites', { name: item.name })} disabled={favorites.busy || !!favoriteLoading} onPress={() => toggleFavorite(item)} style={{ width: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="StarFilled" size={20} color={theme.brandText} />
            </Tap>
          </View>
        ))}
      </View>
    </BottomSheet>
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
  const ok = validTillQuantity(text, parts);
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
        <Button title="Done" disabled={!ok} onPress={() => onSet(text)} />
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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? theme.backgroundSelected : 'transparent' })}>
      <Icon name={icon} size={16} color={icon === 'Trash2' ? theme.danger : theme.textSecondary} />
    </Pressable>
  );
}

/** A sale that was sent but never answered: finish it safely (the shop recognises it by its key) before starting another. */
function UnfinishedSaleSheet({ pending, busy, notice, onFinish, onLater, onDiscard }: { pending: PendingSale | null; busy: boolean; notice: string | null; onFinish: () => void; onLater: () => void; onDiscard: () => void }) {
  const theme = useTheme();
  const t = useT();
  // Keep the last record while the sheet slides away, so it does not go blank on the way out.
  const [shown, setShown] = useState<PendingSale | null>(pending);
  if (pending && pending !== shown) setShown(pending);
  const p = pending ?? shown;
  return (
    <BottomSheet visible={pending !== null} onClose={onLater} title="A sale was not finished">
      {p ? (
        <View accessibilityRole="alert" style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.warningSoft }}>
              <Icon name="TriangleAlert" size={20} color={theme.warning} />
            </View>
            <ThemedText type="body" themeColor="textSecondary" style={{ flex: 1 }}>
              {t('A sale of {amount} was sent but the shop never answered. Finish it now: it cannot be charged twice.', { amount: formatBDT(p.total) })}
            </ThemedText>
          </View>
          {notice ? (
            <ThemedText type="smallMedium" literal style={{ color: theme.danger }}>
              {notice}
            </ThemedText>
          ) : null}
          <Button title="Finish this sale" size="lg" loading={busy} onPress={onFinish} />
          <Button title="Decide later" variant="secondary" disabled={busy} onPress={onLater} />
          <Button title="Throw it away" variant="secondary" disabled={busy} onPress={onDiscard} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

/** A second scan of something already in the cart asks first: one accidental re-read should never change a sale. */
function ScannedAgainSheet({ item, inCart, onYes, onNo }: { item: ScannedItem | null; inCart: string | null; onYes: () => void; onNo: () => void }) {
  const theme = useTheme();
  const t = useT();
  // Keep the last item while the sheet slides away, so it does not go blank on the way out.
  const [shown, setShown] = useState<ScannedItem | null>(item);
  if (item && item !== shown) setShown(item);
  const it = item ?? shown;
  return (
    <BottomSheet visible={item !== null} onClose={onNo} title="Scanned again">
      {it ? (
        <View accessibilityRole="alert" style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.warningSoft }}>
              <Icon name="TriangleAlert" size={20} color={theme.warning} />
            </View>
            <ThemedText type="body" themeColor="textSecondary" style={{ flex: 1 }}>
              {t('{name} is already in the cart ({n}). Add one more?', { name: it.name, n: String(Number(inCart ?? '1')) })}
            </ThemedText>
          </View>
          <Button title="Yes, add one more" size="lg" onPress={onYes} trailing={<Icon name="Plus" size={20} color={theme.onBrand} />} />
          <Button title="No, it was a mistake" variant="secondary" onPress={onNo} />
        </View>
      ) : null}
    </BottomSheet>
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
