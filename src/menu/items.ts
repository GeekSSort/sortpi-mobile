import type { Href } from 'expo-router';

import type { IconName } from '../components/icons/icon.tsx';

/**
 * Everything the phone can do beyond the five tabs, in the groups a shopkeeper thinks in. A row is listed only when its screen
 * exists, so nothing here is a dead end: each new feature adds one line. `needs` is "any of these permissions".
 */
export type MenuGroup = 'sell' | 'stock' | 'people' | 'money';
/** `needs` is any of these permissions, or every one of them when `all` is set (the money list needs both sides of the books). */
export type MenuItem = { id: string; group: MenuGroup; title: string; hint: string; icon: IconName; route: Href; needs: string[]; all?: boolean };

export const GROUP_TITLE: Record<MenuGroup, string> = { sell: 'Selling', stock: 'Stock', people: 'People', money: 'Money' };
const ORDER: MenuGroup[] = ['sell', 'stock', 'people', 'money'];

export const MENU: MenuItem[] = [
  { id: 'movements', group: 'stock', title: 'Stock history', hint: 'Every time an item came in, went out or was corrected', icon: 'Receipt', route: '/movements', needs: ['inventory.view_movements'] },
  { id: 'expiry', group: 'stock', title: 'Expiry dates', hint: 'What has expired and what is about to', icon: 'TriangleAlert', route: '/expiry', needs: ['inventory.view'] },
  { id: 'transfers', group: 'stock', title: 'Transfers', hint: 'Goods sent between your branches or shelves', icon: 'ArrowUpRight', route: '/transfers', needs: ['inventory.transfer'] },
  { id: 'price-check', group: 'sell', title: 'Check a price', hint: 'Scan or type a code to see the price and stock', icon: 'ScanLine', route: '/price-check', needs: ['product.view'] },
  { id: 'sales', group: 'sell', title: 'Sales', hint: 'Find any sale and share the receipt', icon: 'Receipt', route: '/sales', needs: ['sale.view', 'sale.view_own'] },
  { id: 'orders', group: 'sell', title: 'Customer orders', hint: 'Things customers will collect later', icon: 'Package', route: '/orders', needs: ['sale.view'] },
  { id: 'quotations', group: 'sell', title: 'Quotations', hint: 'Give a customer a price before they buy', icon: 'Receipt', route: '/quotations', needs: ['sale.view'] },
  { id: 'returns', group: 'sell', title: 'Take goods back', hint: 'Open the sale, then tap “Take goods back”', icon: 'Undo', route: '/sales', needs: ['sale.refund'] },
  { id: 'end-shift', group: 'sell', title: 'Close the day', hint: 'Count the cash and finish for today', icon: 'Lock', route: '/end-shift', needs: ['pos.shift_close'] },
  { id: 'purchases', group: 'stock', title: 'Purchases', hint: 'Order, receive and pay for goods', icon: 'Package', route: '/purchases', needs: ['purchase.view'] },
  { id: 'new-purchase', group: 'stock', title: 'New purchase', hint: 'Write down goods you bought', icon: 'Plus', route: '/new-purchase', needs: ['purchase.create'] },
  { id: 'stock-count', group: 'stock', title: 'Count your stock', hint: 'Check the shelves and fix the numbers', icon: 'ClipboardCheck', route: '/stock-count', needs: ['inventory.adjust'] },
  { id: 'products', group: 'stock', title: 'Your items', hint: 'See and change prices and offers', icon: 'Package', route: '/products', needs: ['product.view'] },
  { id: 'kinds-brands', group: 'stock', title: 'Kinds and brands', hint: 'Group your items and see what is unused', icon: 'Tag', route: '/kinds-brands', needs: ['category.view', 'brand.view'] },
  { id: 'add-product', group: 'stock', title: 'Add an item', hint: 'Put a new item in your shop', icon: 'Plus', route: '/add-product', needs: ['product.create'] },
  { id: 'reports', group: 'money', title: 'Reports', hint: 'Sales, profit, who owes whom', icon: 'BarChart', route: '/reports', needs: ['report.sales', 'finance.view_pl', 'report.finance'] },
  { id: 'money', group: 'money', title: 'Money in and out', hint: 'Write down rent, tea and other money in or out', icon: 'Cash', route: '/money', needs: ['income.view', 'expense.view'], all: true },
  { id: 'suppliers', group: 'people', title: 'Suppliers', hint: 'See what you owe each supplier and pay them', icon: 'Package', route: '/suppliers', needs: ['supplier.view'] },
  { id: 'shop-settings', group: 'people', title: 'Shop settings', hint: 'VAT, discount, daily target, ways to pay', icon: 'Sliders', route: '/shop-settings', needs: ['settings.view'] },
  { id: 'team', group: 'people', title: 'Your team', hint: 'Who works for you, and who is in today', icon: 'Users', route: '/team', needs: ['hrm.view'] },
  { id: 'access', group: 'people', title: 'Access', hint: 'Who can use the app, and what they may do', icon: 'ShieldCheck', route: '/access', needs: ['user.view', 'role.view', 'branch.view'] },
  { id: 'plan', group: 'people', title: 'Your plan', hint: 'Your SortPi plan, what you use, and how to move up', icon: 'CreditCard', route: '/plan', needs: ['billing.view'] },
  { id: 'activity', group: 'people', title: 'Activity', hint: 'What happened in your shop, and who did it', icon: 'Receipt', route: '/activity', needs: ['audit.view'] },
  { id: 'add-customer', group: 'people', title: 'Add a customer', hint: 'Save a name and phone number', icon: 'Users', route: '/add-customer', needs: ['customer.create'] },
];

/** What this person may open, matched against what they typed in the words they see (`tr` translates a title or hint). */
export function visibleMenu(items: MenuItem[], permissions: string[] | undefined, query: string, tr: (text: string) => string): MenuItem[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((i) => (i.all ? i.needs.every((p) => permissions?.includes(p)) : i.needs.some((p) => permissions?.includes(p))))
    .filter((i) => !q || [i.title, tr(i.title), tr(i.hint)].some((s) => s.toLowerCase().includes(q)));
}

/** Items in group order, each group once, empty groups left out. */
export function groupMenu(items: MenuItem[]): { group: MenuGroup; items: MenuItem[] }[] {
  return ORDER.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length > 0);
}
