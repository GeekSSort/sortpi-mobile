import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/**
 * Interface icons in each platform's own set: SF Symbols on iPhone, Material Symbols on Android. They match the system's
 * tab bar, menus and text weight. Add a screen's icon here once, with both names, and use it by the short name.
 */
const symbols = {
  ArrowDownLeft: { ios: 'arrow.down.left', android: 'south_west' },
  ArrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
  ArrowUpRight: { ios: 'arrow.up.right', android: 'arrow_outward' },
  Sliders: { ios: 'slider.horizontal.3', android: 'tune' },
  Percent: { ios: 'percent', android: 'percent' },
  Flag: { ios: 'flag.fill', android: 'flag' },
  ArrowUp: { ios: 'arrow.up', android: 'arrow_upward' },
  Ruler: { ios: 'ruler', android: 'straighten' },
  Bell: { ios: 'bell', android: 'notifications' },
  Cancel: { ios: 'xmark.circle.fill', android: 'cancel' },
  Cash: { ios: 'banknote', android: 'payments' },
  BarChart: { ios: 'chart.bar.fill', android: 'bar_chart' },
  Share: { ios: 'square.and.arrow.up', android: 'share' },
  Check: { ios: 'checkmark', android: 'check' },
  CheckCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  Tag: { ios: 'tag', android: 'sell' },
  Store: { ios: 'storefront', android: 'storefront' },
  Circle: { ios: 'circle', android: 'radio_button_unchecked' },
  Gift: { ios: 'gift', android: 'redeem' },
  Ticket: { ios: 'ticket', android: 'confirmation_number' },
  Pencil: { ios: 'pencil', android: 'edit' },
  ClipboardCheck: { ios: 'checklist', android: 'fact_check' },
  CreditCard: { ios: 'creditcard', android: 'credit_card' },
  Phone: { ios: 'iphone', android: 'smartphone' },
  Bank: { ios: 'building.columns', android: 'account_balance' },
  Users: { ios: 'person.2.fill', android: 'group' },
  ChevronDown: { ios: 'chevron.down', android: 'expand_more' },
  ChevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  ChevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  Eye: { ios: 'eye', android: 'visibility' },
  EyeOff: { ios: 'eye.slash', android: 'visibility_off' },
  Flashlight: { ios: 'flashlight.on.fill', android: 'flashlight_on' },
  FlashlightOff: { ios: 'flashlight.off.fill', android: 'flashlight_off' },
  Lock: { ios: 'lock', android: 'lock' },
  LogOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  Minus: { ios: 'minus', android: 'remove' },
  Undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  Receipt: { ios: 'doc.text', android: 'receipt_long' },
  Pause: { ios: 'pause.circle', android: 'pause_circle' },
  Package: { ios: 'shippingbox', android: 'inventory_2' },
  Plus: { ios: 'plus', android: 'add' },
  ScanFace: { ios: 'faceid', android: 'face' },
  ScanLine: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
  Search: { ios: 'magnifyingglass', android: 'search' },
  ShieldCheck: { ios: 'checkmark.shield', android: 'verified_user' },
  Trash2: { ios: 'trash', android: 'delete' },
  TriangleAlert: { ios: 'exclamationmark.triangle', android: 'warning' },
  WifiOff: { ios: 'wifi.slash', android: 'wifi_off' },
  X: { ios: 'xmark', android: 'close' },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof symbols;

export function Icon({ name, size = 20, color, strokeWidth }: { name: IconName; size?: number; color?: ColorValue; strokeWidth?: number }) {
  const heavy = (strokeWidth ?? 0) >= 2.5; // a check mark that must read from across the counter
  return <SymbolView name={symbols[name]} size={size} tintColor={color} weight={process.env.EXPO_OS === 'ios' && heavy ? 'bold' : undefined} />;
}
