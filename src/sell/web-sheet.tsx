import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listCategoryRows } from '@/catalog/api';
import { Icon, type IconName } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { WebPos } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

import { lineEstimate, linePrice, type Cart } from './cart';
import { couponText, describeDiscountError } from './discounts';
import { QuantityCell } from './tablet-order-sheet';
import type { Discounts } from './use-discounts';

export const linesAndItems = (t: (k: string, v?: Record<string, string | number>) => string, l: number, i: number): string =>
  `${t(l === 1 ? '1 line' : '{n} lines', { n: l })} · ${t(i === 1 ? '1 item' : '{n} items', { n: i })}`;

/** The wide spreadsheet till, laid out like the web's: a coloured toolbar, the invoice table, the payment strip, and the billing summary beside them. */

export type ToolbarTile = { key: string; label: string; icon: IconName; color: string; ink?: string; badge?: string; hidden?: boolean; onPress: () => void };
export type StripButton = { key: string; label: string; color: string; icon?: IconName; disabled?: boolean; onPress: () => void };

const WHITE = '#ffffff';

function Tile({ tile }: { tile: ToolbarTile }) {
  const ink = tile.ink ?? WHITE;
  const t = useT();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={t(tile.label)} onPress={tile.onPress} style={{ flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, backgroundColor: tile.color }}>
      <Icon name={tile.icon} size={18} color={ink} />
      <ThemedText type="caption" numberOfLines={1} style={{ color: ink }}>{t(tile.label)}{tile.badge ? ` (${tile.badge})` : ''}</ThemedText>
    </Tap>
  );
}

function Box({ icon, label, color, onPress }: { icon: IconName; label: string; color?: string; onPress?: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Tap accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={t(label)} onPress={onPress} disabled={!onPress} style={{ width: 76, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }}>
      <Icon name={icon} size={18} color={color ?? theme.textSecondary} />
      <ThemedText type="caption" numberOfLines={1} style={{ color: color ?? theme.textSecondary }}>{t(label)}</ThemedText>
    </Tap>
  );
}

export function WebToolbar({ cashier, shift, invoice, tiles, wholesale, onPriceMode, online, onRefresh, onActions, onEndShift }: {
  cashier?: string; shift: string; invoice: string; tiles: ToolbarTile[]; wholesale: boolean; onPriceMode: (wholesale: boolean) => void; online: boolean; onRefresh: () => void; onActions: () => void; onEndShift?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const shown = tiles.filter((x) => !x.hidden);
  return (
    <View style={{ flexDirection: 'row', height: 92, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 132, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: WebPos.ink }}>
        <ThemedText type="caption" literal numberOfLines={1} style={{ color: '#94a3b8' }}>{t('SHIFT')} · {shift}</ThemedText>
        <ThemedText type="caption" style={{ color: '#94a3b8' }}>{t('INVOICE')}</ThemedText>
        <ThemedText type="bodyMedium" literal numberOfLines={1} adjustsFontSizeToFit style={{ color: WHITE }}>{invoice || '—'}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>{shown.map((x) => <Tile key={x.key} tile={x} />)}</View>
        <View style={{ height: 40, flexDirection: 'row' }}>
          <Tap accessibilityRole="button" accessibilityState={{ selected: !wholesale }} onPress={() => onPriceMode(false)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: wholesale ? theme.card : WebPos.blue }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? theme.textSecondary : WHITE }}>{t('Retail')}</ThemedText>
          </Tap>
          <Tap accessibilityRole="button" accessibilityState={{ selected: wholesale }} onPress={() => onPriceMode(true)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: wholesale ? WebPos.blue : theme.card, borderWidth: 1, borderColor: WebPos.blue }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? WHITE : theme.textSecondary }}>{t('Wholesale')}</ThemedText>
          </Tap>
        </View>
      </View>
      {cashier ? (
        <View style={{ width: 112, justifyContent: 'center', paddingHorizontal: 8, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }}>
          <ThemedText type="caption" themeColor="textMuted">{t('CASHIER')}</ThemedText>
          <ThemedText type="smallMedium" literal numberOfLines={2}>{cashier}</ThemedText>
        </View>
      ) : null}
      <Box icon={online ? 'Activity' : 'WifiOff'} label={online ? 'Online' : 'Offline'} color={online ? WebPos.teal : WebPos.red} />
      <Box icon="History" label="Refresh" onPress={onRefresh} />
      <Box icon="Sliders" label="Actions" onPress={onActions} />
      {onEndShift ? (
        <Tap accessibilityRole="button" accessibilityLabel={t('End shift')} onPress={onEndShift} style={{ width: 88, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: WebPos.red }}>
          <Icon name="Lock" size={18} color={WHITE} />
          <ThemedText type="caption" style={{ color: WHITE }}>{t('End shift')}</ThemedText>
        </Tap>
      ) : null}
    </View>
  );
}

const COLS = { n: 36, code: 128, qty: 76, unit: 64, price: 92, disc: 92, total: 100, del: 44 };
const GRID = { borderEndWidth: 1 } as const;

/** The invoice as a table: the lines, then numbered empty rows, as on the web. */
export function WebInvoiceTable({ cart, discounts, canPrice, canDiscount, onPrice, onDiscount, onQuantity, onRemove, onEditing }: {
  cart: Cart; discounts?: (string | undefined)[]; canPrice?: boolean; canDiscount?: boolean; onPrice?: (key: string, typed: string) => void; onDiscount?: (key: string, typed: string) => void; onQuantity: (key: string, quantity: string) => void; onRemove: (key: string, name: string) => void; onEditing: (key: string, editing: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const head = { type: 'caption' as const, style: { color: theme.textSecondary, letterSpacing: 0.6 } };
  const blanks = Math.max(0, 11 - cart.length);
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 36, backgroundColor: WebPos.tableHead, borderBottomWidth: 1, borderColor: theme.border }}>
        <ThemedText {...head} style={[head.style, { width: COLS.n, textAlign: 'center' }]}>#</ThemedText>
        <ThemedText {...head} style={[head.style, { width: COLS.code }]}>{t('CODE / SKU')}</ThemedText>
        <ThemedText {...head} style={[head.style, { flex: 1 }]}>{t('PRODUCT NAME')}</ThemedText>
        <ThemedText {...head} style={[head.style, { width: COLS.qty, textAlign: 'center' }]}>{t('QTY')}</ThemedText>
        <ThemedText {...head} style={[head.style, { width: COLS.unit }]}>{t('UNIT')}</ThemedText>
        <ThemedText {...head} style={[head.style, { width: COLS.price, textAlign: 'right' }]}>{t('PRICE')}</ThemedText>
        {discounts ? <ThemedText {...head} style={[head.style, { width: COLS.disc, textAlign: 'right' }]}>{t('DISCOUNT')}</ThemedText> : null}
        <ThemedText {...head} style={[head.style, { width: COLS.total, textAlign: 'right', paddingEnd: 8 }]}>{t('TOTAL')}</ThemedText>
        <View style={{ width: COLS.del }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
        {cart.map((line, i) => (
          <View key={line.key} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: 1, borderColor: theme.border }}>
            <ThemedText type="caption" style={{ width: COLS.n, textAlign: 'center', color: theme.textMuted }}>{i + 1}</ThemedText>
            <ThemedText type="small" literal numberOfLines={1} style={{ width: COLS.code, color: theme.textSecondary }}>{line.sku}</ThemedText>
            <ThemedText type="smallMedium" literal numberOfLines={2} style={{ flex: 1, paddingEnd: 8 }}>{line.name}</ThemedText>
            <View style={{ width: COLS.qty, alignItems: 'center' }}>
              <QuantityCell line={line} onChange={(value) => onQuantity(line.key, value)} onEditing={(editing) => onEditing(line.key, editing)} />
            </View>
            <ThemedText type="small" literal numberOfLines={1} style={{ width: COLS.unit, color: theme.textSecondary }}>{line.unitLabel ?? line.unitShort ?? ''}</ThemedText>
            {canPrice && onPrice ? (
              <MoneyCell width={COLS.price} value={line.priceSet} shown={formatBDT(linePrice(line))} accent={!!line.priceSet} label={t('Unit price of {name}', { name: line.name })} onCommit={(typed) => onPrice(line.key, typed)} />
            ) : (
              <ThemedText type="small" numberOfLines={1} style={{ width: COLS.price, textAlign: 'right' }}>{formatBDT(linePrice(line))}</ThemedText>
            )}
            {discounts ? (
              canDiscount && onDiscount ? (
                <MoneyCell width={COLS.disc} value={line.lineDiscount} shown={line.lineDiscount ? `−${formatBDT(line.lineDiscount)}` : discounts[i] ? `−${formatBDT(discounts[i])}` : '—'} accent={!!line.lineDiscount} label={t('Discount on {name}', { name: line.name })} onCommit={(typed) => onDiscount(line.key, typed)} />
              ) : (
                <ThemedText type="small" numberOfLines={1} style={{ width: COLS.disc, textAlign: 'right', color: discounts[i] ? theme.danger : theme.textMuted }}>{discounts[i] ? `−${formatBDT(discounts[i])}` : '—'}</ThemedText>
              )
            ) : null}
            <ThemedText type="smallMedium" numberOfLines={1} style={{ width: COLS.total, textAlign: 'right', paddingEnd: 8 }}>{formatBDT(lineEstimate(line))}</ThemedText>
            <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: line.name })} onPress={() => { onEditing(line.key, false); onRemove(line.key, line.name); }} style={{ width: COLS.del, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Trash2" size={18} color={theme.danger} />
            </Tap>
          </View>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <View key={`b${i}`} style={{ flexDirection: 'row', alignItems: 'stretch', height: 40, borderBottomWidth: 1, borderColor: theme.border }}>
            <View style={{ width: COLS.n, justifyContent: 'center', ...GRID, borderColor: theme.border }}>
              <ThemedText type="caption" style={{ textAlign: 'center', color: theme.border }}>{cart.length + i + 1}</ThemedText>
            </View>
            <View style={{ width: COLS.code, ...GRID, borderColor: theme.border }} />
            <View style={{ flex: 1, ...GRID, borderColor: theme.border }} />
            <View style={{ width: COLS.qty, ...GRID, borderColor: theme.border }} />
            <View style={{ width: COLS.unit, ...GRID, borderColor: theme.border }} />
            <View style={{ width: COLS.price, ...GRID, borderColor: theme.border }} />
            {discounts ? <View style={{ width: COLS.disc, ...GRID, borderColor: theme.border }} /> : null}
            <View style={{ width: COLS.total, ...GRID, borderColor: theme.border }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function StripButtons({ buttons, columns }: { buttons: StripButton[]; columns?: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: columns ? 'wrap' : 'nowrap', gap: 8 }}>
      {buttons.map((b) => (
        <Tap key={b.key} accessibilityRole="button" accessibilityLabel={t(b.label)} accessibilityState={{ disabled: !!b.disabled }} disabled={b.disabled} onPress={b.onPress} style={{ flexGrow: 1, flexBasis: columns ? `${Math.floor(100 / columns) - 3}%` : 0, minHeight: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 2, backgroundColor: b.color, opacity: b.disabled ? 0.45 : 1 }}>
          {b.icon ? <Icon name={b.icon} size={16} color={WHITE} /> : null}
          <ThemedText type="smallMedium" numberOfLines={1} style={{ color: WHITE, letterSpacing: 0.4 }}>{t(b.label).toUpperCase()}</ThemedText>
        </Tap>
      ))}
    </View>
  );
}

/** Pay and hold buttons under the table, with the total, as the web's payment strip. */
export function WebPaymentStrip({ total, pay, actions }: { total: string; pay: StripButton[]; actions: StripButton[] }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ gap: 8, padding: 10, backgroundColor: WebPos.band, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 6 }}>
        <ThemedText type="small" style={{ color: theme.textSecondary, letterSpacing: 0.6 }}>{t('PAYMENT')}</ThemedText>
        <ThemedText type="heading" numberOfLines={1}>{t('TOTAL')} {total}</ThemedText>
      </View>
      <StripButtons buttons={pay} />
      <StripButtons buttons={actions} />
    </View>
  );
}

/** The right-hand panel: who is buying and what the sale comes to. */
export function BillingSummary({ invoice, wholesale, customer, owes, onCustomer, lines, items, subtotal, tax, grand, note, discount, coupon, shipping, onFind, onAdd, children, footer }: {
  invoice: string; discount?: string; coupon?: string; shipping?: string; onFind?: () => void; onAdd?: () => void; wholesale: boolean; customer: string | null; owes?: string; onCustomer?: () => void; lines: number; items: number; subtotal: string; tax?: string; grand: string; note?: string | null; children?: ReactNode; footer?: ReactNode;
}) {
  const theme = useTheme();
  const t = useT();
  const row = (label: string, value: string, strong?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? 'text' : 'textSecondary'}>{label}</ThemedText>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} numberOfLines={1} themeColor={strong ? 'text' : 'textSecondary'}>{value}</ThemedText>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: WebPos.panel }}>
        <View>
          <ThemedText type="caption" style={{ color: '#94a3b8', letterSpacing: 0.8 }}>{t('BILLING SUMMARY')}</ThemedText>
          <ThemedText type="small" literal style={{ color: WHITE }}>{invoice || '—'}</ThemedText>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: WebPos.blue }}>
          <ThemedText type="caption" style={{ color: WHITE }}>{t(wholesale ? 'WHOLESALE' : 'RETAIL')}</ThemedText>
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }}>
        {onCustomer ? (
          <Tap accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={onCustomer} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderStartWidth: 4, borderColor: theme.border, borderStartColor: WebPos.blue }}>
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Icon name="Users" size={20} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" themeColor="textMuted">{t('CUSTOMER')}</ThemedText>
              <ThemedText type="bodyMedium" literal={!!customer} numberOfLines={1}>{customer ?? t('Walk-in Customer')}</ThemedText>
              {owes ? <ThemedText type="caption" literal style={{ color: theme.danger }}>{owes}</ThemedText> : null}
            </View>
            <ThemedText type="smallMedium" style={{ color: theme.brandText }}>{t(customer ? 'Change' : 'All customers')}</ThemedText>
          </Tap>
        ) : null}
        {onFind ? (
          <View style={{ gap: 4 }}>
            <ThemedText type="caption" themeColor="textSecondary" style={{ letterSpacing: 0.6 }}>{t('FIND BY NAME OR PHONE')}</ThemedText>
            <View style={{ flexDirection: 'row', height: 48 }}>
              <Tap accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={onFind} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="small" themeColor="textMuted">{t('Name or phone number')}</ThemedText>
              </Tap>
              <Tap accessibilityRole="button" accessibilityLabel={t('Search')} onPress={onFind} style={{ width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: WebPos.blue }}>
                <Icon name="Search" size={18} color={WHITE} />
              </Tap>
              {onAdd ? (
                <Tap accessibilityRole="button" accessibilityLabel={t('Add Customer')} onPress={onAdd} style={{ paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: WebPos.ink }}>
                  <ThemedText type="smallMedium" style={{ color: WHITE }}>+ {t('ADD')}</ThemedText>
                </Tap>
              ) : null}
            </View>
          </View>
        ) : null}
        {children}
        <View style={{ borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: WebPos.tableHead, borderBottomWidth: 1, borderColor: theme.border }}>
            <ThemedText type="caption" style={{ letterSpacing: 0.8 }}>{t('SALE TOTALS')}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">{linesAndItems(t, lines, items)}</ThemedText>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
            {row(t('Subtotal'), subtotal, true)}
            {discount !== undefined ? row(t('Discount'), discount) : null}
            {coupon !== undefined ? row(t('Coupon'), coupon) : null}
            {shipping !== undefined ? row(t('Shipping'), shipping) : null}
            {tax !== undefined ? row(t('Tax'), tax) : null}
          </View>
        </View>
        {note ? <ThemedText type="caption" themeColor="textMuted">{note}</ThemedText> : null}
        <ThemedText type="caption" themeColor="textMuted">{t('Coupon and how it is paid are chosen when you take payment.')}</ThemedText>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: WebPos.blue }}>
        <ThemedText type="smallMedium" style={{ color: WHITE, letterSpacing: 0.8 }}>{t('GRAND TOTAL')}</ThemedText>
        <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit style={{ color: WHITE }}>{grand}</ThemedText>
      </View>
      {footer ? <View style={{ gap: 8, padding: 12, backgroundColor: theme.card }}>{footer}</View> : null}
    </View>
  );
}

export type QuickAction = { key: string; label: string; icon: IconName; hidden?: boolean; badge?: string; onPress: () => void };

/** The till's quick actions, in a panel from the right edge, like the web's Actions rail: each row does what its name says, then the panel closes. */
export function QuickActionsDrawer({ visible, onClose, actions }: { visible: boolean; onClose: () => void; actions: QuickAction[] }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        <View style={{ width: 320, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 56, backgroundColor: WebPos.panel }}>
            <ThemedText type="bodyMedium" style={{ color: WHITE }}>{t('Quick actions')}</ThemedText>
            <Tap accessibilityRole="button" accessibilityLabel={t('Close')} onPress={onClose} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="X" size={22} color={WHITE} />
            </Tap>
          </View>
          <ScrollView>
            {actions.filter((a) => !a.hidden).map((a) => (
              <Tap key={a.key} accessibilityRole="button" onPress={() => { onClose(); a.onPress(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: theme.border }}>
                <Icon name={a.icon} size={22} color={theme.brand} />
                <ThemedText type="body" style={{ flex: 1 }}>{t(a.label)}</ThemedText>
                <Icon name="ChevronRight" size={18} color={theme.textMuted} />
              </Tap>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** "Current order" for the touch till: the lines with plus and minus, so a quantity is one tap. */
export function WebOrderColumn({ cart, onStep, onRemove, onClear }: { cart: Cart; onStep: (key: string, by: number) => void; onRemove: (key: string, name: string) => void; onClear: () => void }) {
  const theme = useTheme();
  const t = useT();
  const step = (icon: 'Minus' | 'Plus', label: string, by: number, key: string) => (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={() => onStep(key, by)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: icon === 'Plus' ? WebPos.green : theme.card, borderWidth: 1, borderColor: icon === 'Plus' ? WebPos.green : theme.border }}>
      <Icon name={icon} size={18} color={icon === 'Plus' ? WHITE : theme.danger} />
    </Tap>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, minHeight: 56, borderBottomWidth: 1, borderColor: theme.border }}>
        <ThemedText type="bodyMedium">{t('Current order')}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted" style={{ flex: 1 }}>{t(cart.length === 1 ? '1 line' : '{n} lines', { n: cart.length })}</ThemedText>
        <Tap accessibilityRole="button" accessibilityLabel={t('Clear')} disabled={cart.length === 0} onPress={onClear} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', opacity: cart.length === 0 ? 0.4 : 1 }}>
          <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Clear')}</ThemedText>
        </Tap>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {cart.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
            <Icon name="ShoppingBag" size={28} color={theme.textMuted} />
            <ThemedText type="small" themeColor="textMuted" style={{ textAlign: 'center' }}>{t('Tap a product or scan a barcode to start the order.')}</ThemedText>
          </View>
        ) : cart.map((l) => (
          <View key={l.key} style={{ gap: 6, padding: 12, borderBottomWidth: 1, borderColor: theme.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ThemedText type="smallMedium" literal numberOfLines={2} style={{ flex: 1 }}>{l.name}{l.unitLabel ? ` (${l.unitLabel})` : ''}</ThemedText>
              <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: l.name })} onPress={() => onRemove(l.key, l.name)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="Trash2" size={18} color={theme.danger} />
              </Tap>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {step('Minus', t('Fewer {name}', { name: l.name }), l.allowDecimal ? -0.5 : -1, l.key)}
              <View style={{ minWidth: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                <ThemedText type="bodyMedium">{Number(l.quantity)}</ThemedText>
              </View>
              {step('Plus', t('More {name}', { name: l.name }), l.allowDecimal ? 0.5 : 1, l.key)}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <ThemedText type="caption" themeColor="textMuted">{formatBDT(l.unitPrice)}</ThemedText>
                <ThemedText type="smallMedium">{formatBDT(lineEstimate(l))}</ThemedText>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** The express till's top row: small coloured buttons for the till's own jobs, as on the web. */
export function ExpressBar({ shift, invoice, tiles }: { shift: string; invoice: string; tiles: ToolbarTile[] }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: theme.canvas }}>
      <View style={{ height: 56, minWidth: 120, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: WebPos.blue, borderWidth: 2, borderColor: WebPos.ink }}>
        <ThemedText type="caption" literal numberOfLines={1} style={{ color: '#dbeafe' }}>{shift}</ThemedText>
        <ThemedText type="smallMedium" literal numberOfLines={1} style={{ color: WHITE }}>{invoice || '—'}</ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {tiles.filter((x) => !x.hidden).map((x) => (
          <Tap key={x.key} accessibilityRole="button" accessibilityLabel={t(x.label)} onPress={x.onPress} style={{ width: 76, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: x.color }}>
            <Icon name={x.icon} size={18} color={x.ink ?? WHITE} />
            <ThemedText type="caption" numberOfLines={1} style={{ color: x.ink ?? WHITE }}>{t(x.label)}</ThemedText>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

function ExpressButton({ label, color, onPress, off, grow }: { label: string; color: string; onPress?: () => void; off?: boolean; grow?: boolean }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!off }} onPress={onPress} style={{ flexGrow: 1, flexBasis: grow ? '100%' : '30%', minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: color, opacity: off ? 0.5 : 1 }}>
      <ThemedText type="smallMedium" numberOfLines={1} style={{ color: WHITE }}>{label}</ThemedText>
    </Tap>
  );
}

/** The express till's right column: the customer, the counts, and the pay buttons. */
export function ExpressDetails({ counter, invoice, onPriceMode, customer, owes, onCustomer, onAddCustomer, wholesale, lines, items, total, empty, onClear, buttons, options }: {
  counter: string; invoice: string; onPriceMode: (wholesale: boolean) => void; options?: ReactNode; customer: string | null; owes?: string; onCustomer?: () => void; onAddCustomer?: () => void; wholesale: boolean; lines: number; items: number; total: string; empty: boolean; onClear: () => void; buttons: { pay: () => void; quick: () => void; credit: () => void; recent?: () => void; hold?: () => void; reset: () => void };
}) {
  const theme = useTheme();
  const t = useT();
  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>{label}</ThemedText>
      <ThemedText type="smallMedium" numberOfLines={1}>{value}</ThemedText>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.card, borderStartWidth: 1, borderColor: theme.border }} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 2, paddingBottom: 10, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: theme.border }}>
        <ThemedText type="heading">{t('Transaction Details')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" literal>{t('Transaction ID')} : #{invoice || '—'}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>{t('Counter')}: {counter}</ThemedText>
      </View>
      <View style={{ gap: 8 }}>
        <ThemedText type="bodyMedium">{t('Customer Information')}</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tap accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={onCustomer} disabled={!onCustomer} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border }}>
            <Icon name="Users" size={18} color={theme.textSecondary} />
            <ThemedText type="small" literal={!!customer} numberOfLines={1} style={{ flex: 1 }}>{customer ?? t('Walk-in Customer')}</ThemedText>
            <Icon name="ChevronDown" size={16} color={theme.textSecondary} />
          </Tap>
          {onAddCustomer ? (
            <Tap accessibilityRole="button" accessibilityLabel={t('Add Customer')} onPress={onAddCustomer} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Icon name="Plus" size={20} color={theme.text} />
            </Tap>
          ) : null}
        </View>
        {owes ? <ThemedText type="caption" literal style={{ color: theme.danger }}>{owes}</ThemedText> : null}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start' }}>
          <Tap accessibilityRole="button" accessibilityState={{ selected: !wholesale }} onPress={() => onPriceMode(false)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: wholesale ? theme.canvas : WebPos.green }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? theme.textSecondary : WHITE }}>{t('Retail')}</ThemedText>
          </Tap>
          <Tap accessibilityRole="button" accessibilityState={{ selected: wholesale }} onPress={() => onPriceMode(true)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: wholesale ? WebPos.green : theme.canvas }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? WHITE : theme.textSecondary }}>{t('Wholesale')}</ThemedText>
          </Tap>
        </View>
      </View>
      <View style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderColor: theme.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText type="bodyMedium">{t('Order Details')}</ThemedText>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.successSoft }}>
            <ThemedText type="smallMedium" style={{ color: theme.success }}>{String(lines).padStart(2, '0')}</ThemedText>
          </View>
          <View style={{ flex: 1 }} />
          <Tap accessibilityRole="button" accessibilityLabel={t('Clear All')} disabled={empty} onPress={onClear} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: theme.danger, opacity: empty ? 0.5 : 1 }}>
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Clear All')}</ThemedText>
          </Tap>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {stat(t('Total Items'), String(items))}
          {stat(t('Unique Items'), String(lines))}
          {stat(t('Total Price'), total)}
        </View>
        {options}
        <ThemedText type="caption" themeColor="textMuted">{t('Coupon and how it is paid are chosen when you take payment.')}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ExpressButton label={`${t('Pay')} ${total}`} color={WebPos.blue} onPress={buttons.pay} off={empty} grow />
        <ExpressButton label={t('Quick Pay')} color="#6b7280" onPress={buttons.quick} off={empty} />
        <ExpressButton label={t('Credit Sale')} color="#22a55a" onPress={buttons.credit} off={empty} />
        {buttons.recent ? <ExpressButton label={t('Recent')} color={WebPos.blue} onPress={buttons.recent} /> : null}
        {buttons.hold ? <ExpressButton label={t('Hold')} color="#f97316" onPress={buttons.hold} off={empty} /> : null}
        <ExpressButton label={t('Reset')} color="#dc2626" onPress={buttons.reset} off={empty} />
      </View>
    </ScrollView>
  );
}

type RailView = 'actions' | 'categories';

/** The web's left rail: Category and Feature tabs over a "Quick actions" card, one row per till job. */
export function QuickActionsRail({ actions, picked, onPickCategory, onClearCategory }: {
  actions: QuickAction[]; picked: { id: string; name: string } | null; onPickCategory: (c: { id: string; name: string }) => void; onClearCategory: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [view, setView] = useState<RailView>('actions');
  const categories = useQuery({ queryKey: ['rail', 'categories'], queryFn: listCategoryRows, enabled: view === 'categories', staleTime: 5 * 60_000 });
  const tab = (key: string, label: string, color: string, on: () => void) => (
    <Tap key={key} accessibilityRole="tab" accessibilityLabel={t(label)} onPress={on} style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
      <ThemedText type="smallMedium" numberOfLines={1} style={{ color: WHITE }}>{t(label)}</ThemedText>
    </Tap>
  );
  const tile = (icon: IconName) => (
    <View style={{ width: 40, height: 41, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: WebPos.tableHead }}>
      <Icon name={icon} size={20} color={theme.textSecondary} />
    </View>
  );
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tab('category', 'Category', WebPos.blue, () => setView(view === 'categories' ? 'actions' : 'categories'))}
        {tab('feature', 'Feature', WebPos.purple, () => { setView('actions'); onClearCategory(); })}
      </View>
      <View style={{ flex: 1, backgroundColor: theme.card, padding: 12, gap: 12 }}>
        <View style={{ borderBottomWidth: 1, borderStyle: 'dashed', borderColor: theme.border, paddingBottom: 10 }}>
          <ThemedText type="bodyMedium">{t(view === 'categories' ? 'Category' : 'Quick actions')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t(view === 'categories' ? 'Choose a category' : 'keyboard or mouse')}</ThemedText>
        </View>
        {picked && view === 'actions' ? (
          <Tap accessibilityRole="button" accessibilityLabel={t('Show everything')} onPress={onClearCategory} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: theme.brandSoft }}>
            <ThemedText type="smallMedium" literal numberOfLines={1} style={{ flex: 1, color: theme.brandText }}>{picked.name}</ThemedText>
            <Icon name="X" size={16} color={theme.brandText} />
          </Tap>
        ) : null}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
          {view === 'actions' ? (
            <>
              <ThemedText type="smallMedium" themeColor="textSecondary">{t('Sale')}</ThemedText>
              {actions.filter((a) => !a.hidden).map((a) => (
                <Tap key={a.key} accessibilityRole="button" onPress={a.onPress} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 8, borderWidth: 1, borderColor: theme.border }}>
                  {tile(a.icon)}
                  <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>{t(a.label)}</ThemedText>
                </Tap>
              ))}
            </>
          ) : (
            <>
              {categories.isPending ? <ThemedText type="small" themeColor="textMuted">{t('Loading…')}</ThemedText> : null}
              {categories.isError ? <ThemedText type="small" themeColor="textMuted">{t('This list could not be loaded.')}</ThemedText> : null}
              {(categories.data ?? []).map((c) => (
                <Tap key={c.id} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => { onPickCategory({ id: c.id, name: c.name }); setView('actions'); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 8, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ width: 40, height: 41, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: WebPos.tableHead }}>
                    <ThemedText type="bodyMedium" literal>{c.name.charAt(0).toUpperCase()}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" literal numberOfLines={1}>{c.name}</ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">{t(c.product_count === 1 ? '1 product' : '{n} products', { n: c.product_count })}</ThemedText>
                  </View>
                  <Icon name="ChevronRight" size={18} color={theme.textMuted} />
                </Tap>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

/** The wall's right column: the customer and the order, as a table of lines. */
export function WallOrderPanel({ counter, invoice, onPriceMode, customer, owes, onCustomer, onAddCustomer, wholesale, lines, empty, onClear, children }: {
  counter: string; invoice: string; onPriceMode: (wholesale: boolean) => void; customer: string | null; owes?: string; onCustomer?: () => void; onAddCustomer?: () => void; wholesale: boolean; lines: number; empty: boolean; onClear: () => void; children: ReactNode;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ gap: 2, paddingBottom: 10, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: theme.border }}>
          <ThemedText type="heading">{t('Transaction Details')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" literal>{t('Transaction ID')} : #{invoice || '—'}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted" literal>{t('Counter')}: {counter}</ThemedText>
        </View>
        <ThemedText type="bodyMedium">{t('Customer Information')}</ThemedText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tap accessibilityRole="button" accessibilityLabel={t('Choose the customer')} onPress={onCustomer} disabled={!onCustomer} style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border }}>
            <Icon name="Users" size={18} color={theme.textSecondary} />
            <ThemedText type="small" literal={!!customer} numberOfLines={1} style={{ flex: 1 }}>{customer ?? t('Walk-in Customer')}</ThemedText>
            <Icon name="ChevronDown" size={16} color={theme.textSecondary} />
          </Tap>
          {onAddCustomer ? (
            <Tap accessibilityRole="button" accessibilityLabel={t('Add Customer')} onPress={onAddCustomer} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Icon name="Plus" size={20} color={theme.text} />
            </Tap>
          ) : null}
        </View>
        {owes ? <ThemedText type="caption" literal style={{ color: theme.danger }}>{owes}</ThemedText> : null}
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start' }}>
          <Tap accessibilityRole="button" accessibilityState={{ selected: !wholesale }} onPress={() => onPriceMode(false)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: wholesale ? theme.canvas : WebPos.green }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? theme.textSecondary : WHITE }}>{t('Retail')}</ThemedText>
          </Tap>
          <Tap accessibilityRole="button" accessibilityState={{ selected: wholesale }} onPress={() => onPriceMode(true)} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: wholesale ? WebPos.green : theme.canvas }}>
            <ThemedText type="smallMedium" style={{ color: wholesale ? WHITE : theme.textSecondary }}>{t('Wholesale')}</ThemedText>
          </Tap>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText type="bodyMedium">{t('Order Details')}</ThemedText>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: theme.successSoft }}>
            <ThemedText type="smallMedium" style={{ color: theme.success }}>{String(lines).padStart(2, '0')}</ThemedText>
          </View>
          <View style={{ flex: 1 }} />
          <Tap accessibilityRole="button" accessibilityLabel={t('Clear All')} disabled={empty} onPress={onClear} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: theme.danger, opacity: empty ? 0.5 : 1 }}>
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Clear All')}</ThemedText>
          </Tap>
        </View>
      </View>
      <View style={{ flex: 1, borderTopWidth: 1, borderColor: theme.border }}>{children}</View>
    </View>
  );
}

/** The wall's checkout block under the products: the counts and the pay buttons. */
export function WallCheckout({ items, unique, total, empty, buttons, options }: {
  options?: ReactNode; items: number; unique: number; total: string; empty: boolean; buttons: { pay: () => void; quick: () => void; credit: () => void; recent?: () => void; hold?: () => void; reset: () => void };
}) {
  const theme = useTheme();
  const t = useT();
  const stat = (label: string, value: string) => (
    <View style={{ flex: 1, flexDirection: 'row', gap: 6, padding: 10, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="smallMedium" numberOfLines={1}>{label}</ThemedText>
      <ThemedText type="smallMedium" numberOfLines={1}>{value}</ThemedText>
    </View>
  );
  return (
    <View style={{ gap: 10, padding: 12, backgroundColor: theme.card, borderTopWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {stat(t('Total Items'), String(items))}
        {stat(t('Unique Items'), String(unique))}
        {stat(t('Total Price'), total)}
      </View>
      {options}
      <ThemedText type="caption" themeColor="textMuted">{t('Coupon and how it is paid are chosen when you take payment.')}</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <ExpressButton label={`${t('Pay')} ${total}`} color={WebPos.blue} onPress={buttons.pay} off={empty} grow />
        <ExpressButton label={t('Quick Pay')} color="#6b7280" onPress={buttons.quick} off={empty} />
        <ExpressButton label={t('Credit Sale')} color="#22a55a" onPress={buttons.credit} off={empty} />
        {buttons.recent ? <ExpressButton label={t('Recent')} color={WebPos.blue} onPress={buttons.recent} /> : null}
        {buttons.hold ? <ExpressButton label={t('Hold')} color="#f97316" onPress={buttons.hold} off={empty} /> : null}
        <ExpressButton label={t('Reset')} color="#dc2626" onPress={buttons.reset} off={empty} />
      </View>
    </View>
  );
}

/** "Sale options" like the web's: a discount on the whole order, as a percent or an amount. The server applies it and says what it came to. */
export function SaleOptions({ discount, applied, onApply, onClear, focusSignal, extra }: {
  extra?: ReactNode; focusSignal?: number; discount: { kind: 'PCT' | 'AMT'; value: string } | null; applied?: string; onApply: (kind: 'PCT' | 'AMT', typed: string) => string | null; onClear: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [kind, setKind] = useState<'PCT' | 'AMT'>('PCT');
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (!focusSignal) return;
    const id = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(id);
  }, [focusSignal]);
  const seg = (k: 'PCT' | 'AMT', label: string) => (
    <Tap accessibilityRole="button" accessibilityState={{ selected: kind === k }} accessibilityLabel={label} onPress={() => setKind(k)} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === k ? WebPos.ink : theme.card, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="smallMedium" style={{ color: kind === k ? WHITE : theme.text }}>{label}</ThemedText>
    </Tap>
  );
  return (
    <View style={{ gap: 8, padding: 10, borderWidth: 1, borderColor: theme.border }}>
      <ThemedText type="caption" style={{ letterSpacing: 0.8 }}>{t('SALE OPTIONS')}</ThemedText>
      <ThemedText type="smallMedium">{t('Order discount')}</ThemedText>
      {discount ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText type="small" literal style={{ flex: 1 }}>{discount.kind === 'PCT' ? `${discount.value}%` : `৳ ${discount.value}`}{applied ? ` · −${applied}` : ''}</ThemedText>
          <Tap accessibilityRole="button" accessibilityLabel={t('Remove the discount')} onPress={() => { onClear(); setTyped(''); }} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: theme.danger }}>
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Remove')}</ThemedText>
          </Tap>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            {seg('PCT', '%')}
            {seg('AMT', '৳')}
            <TextInput ref={input} accessibilityLabel={t('Order discount')} value={typed} onChangeText={(v) => { setTyped(v); setProblem(null); }} placeholder={t('Enter amount')} placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" disableFullscreenUI style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 10, color: theme.text, borderWidth: 1, borderColor: theme.border }} />
            <Tap accessibilityRole="button" accessibilityLabel={t('Apply')} onPress={() => setProblem(onApply(kind, typed))} style={{ minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: WebPos.ink }}>
              <ThemedText type="smallMedium" style={{ color: WHITE }}>{t('Apply')}</ThemedText>
            </Tap>
          </View>
          {problem ? <ThemedText type="caption" style={{ color: theme.danger }}>{t(problem)}</ThemedText> : null}
        </>
      )}
      {extra}
    </View>
  );
}

/** The web's permanent "Quick actions" panel: the till's jobs in two lists, Sale and Till, one tap each. */
export function QuickActionsPanel({ sale, till }: { sale: QuickAction[]; till: QuickAction[] }) {
  const theme = useTheme();
  const t = useT();
  const section = (title: string, rows: QuickAction[]) => (
    <View style={{ gap: 8 }}>
      <ThemedText type="caption" themeColor="textSecondary" style={{ letterSpacing: 1 }}>{t(title)}</ThemedText>
      {rows.filter((a) => !a.hidden).map((a) => (
        <Tap key={a.key} accessibilityRole="button" accessibilityLabel={t(a.label)} onPress={a.onPress} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }}>
          <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: WebPos.tableHead }}>
            <Icon name={a.icon} size={18} color={theme.textSecondary} />
          </View>
          <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>{t(a.label)}{a.badge ? ` (${a.badge})` : ''}</ThemedText>
        </Tap>
      ))}
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ padding: 12, borderBottomWidth: 1, borderStyle: 'dashed', borderColor: theme.border }}>
        <ThemedText type="bodyMedium">{t('Quick actions')}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">{t('Keyboard or mouse')}</ThemedText>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 14 }}>
        {section('SALE', sale)}
        {section('TILL', till)}
      </ScrollView>
    </View>
  );
}

/** "Coupon" in the sale options: a code and Apply, or the coupon that is on, with what it takes off. The server checks the code. */
export function CouponBox({ d }: { d: Discounts }) {
  const theme = useTheme();
  const t = useT();
  const [draft, setDraft] = useState('');
  const apply = () => {
    if (!draft.trim()) return;
    Keyboard.dismiss();
    d.applyCoupon(draft);
  };
  const error = d.couponError && d.appliedCode === couponText(draft) ? t(describeDiscountError(d.couponError)) : undefined;
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallMedium">{t('Coupon')}</ThemedText>
      {d.coupon ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemedText type="small" literal style={{ flex: 1, color: theme.success }}>{d.coupon.code} · −{formatBDT(d.coupon.discount)}</ThemedText>
          <Tap accessibilityRole="button" accessibilityLabel={t('Remove the coupon')} onPress={() => { d.removeCoupon(); setDraft(''); }} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: theme.danger }}>
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>{t('Remove')}</ThemedText>
          </Tap>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            <TextInput accessibilityLabel={t('Coupon code')} value={draft} onChangeText={setDraft} autoCapitalize="characters" autoCorrect={false} placeholder={t('Enter coupon code')} placeholderTextColor={theme.textMuted} onSubmitEditing={apply} disableFullscreenUI style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 10, color: theme.text, borderWidth: 1, borderColor: theme.border }} />
            <Tap accessibilityRole="button" accessibilityLabel={t('Apply')} onPress={apply} style={{ minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: WebPos.ink }}>
              <ThemedText type="smallMedium" style={{ color: WHITE }}>{d.couponBusy ? '…' : t('Apply')}</ThemedText>
            </Tap>
          </View>
          {error ? <ThemedText type="caption" style={{ color: theme.danger }}>{error}</ThemedText> : null}
        </>
      )}
    </View>
  );
}

/** A money cell you can tap and type in, like the web's table: shows the figure, takes a new one on Done, and an empty box puts the original back. */
function MoneyCell({ width, value, shown, accent, label, onCommit }: { width: number; value?: string; shown: string; accent: boolean; label: string; onCommit: (typed: string) => void }) {
  const theme = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <TextInput
      accessibilityLabel={label}
      value={draft ?? shown}
      onFocus={() => setDraft(value ?? '')}
      onChangeText={setDraft}
      onEndEditing={({ nativeEvent }) => { onCommit(nativeEvent.text.trim()); setDraft(null); }}
      keyboardType="decimal-pad"
      disableFullscreenUI
      selectTextOnFocus
      returnKeyType="done"
      style={{ width, minHeight: 44, textAlign: 'right', paddingHorizontal: 6, fontSize: 14, color: accent ? WebPos.blue : theme.text, fontWeight: accent ? '700' : '400' }}
    />
  );
}

/** "Shipping" in the sale options: delivery charged on top of the goods. The server adds it, untaxed, to the total. */
export function ShippingBox({ value, onChange, problem }: { value: string; onChange: (typed: string) => void; problem: string | null }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallMedium">{t('Shipping')}</ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: problem ? theme.danger : theme.border }}>
        <ThemedText type="small" themeColor="textMuted" style={{ paddingStart: 10 }}>৳</ThemedText>
        <TextInput accessibilityLabel={t('Shipping')} value={value} onChangeText={onChange} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" disableFullscreenUI style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 8, color: theme.text }} />
      </View>
      {problem ? <ThemedText type="caption" style={{ color: theme.danger }}>{t(problem)}</ThemedText> : null}
    </View>
  );
}
