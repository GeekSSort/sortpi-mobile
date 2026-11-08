import type { Href } from 'expo-router';

import type { IconName } from '../components/icons/icon.tsx';

/**
 * Everything the phone can do beyond the five tabs, in the groups a shopkeeper thinks in. A row is listed only when its screen
 * exists, so nothing here is a dead end: each new feature adds one line. `needs` is "any of these permissions".
 */
export type MenuGroup = 'dashboard' | 'inventory' | 'stocks' | 'sales' | 'crm' | 'purchases' | 'warehouse' | 'finance' | 'reports' | 'hrm' | 'roles' | 'branches' | 'settings';
/** `needs` is any of these permissions, or every one of them when `all` is set (the money list needs both sides of the books). */
/** `trade` is a feature of the shop's trade (`me.organization.category.features`, like the web's `tradeFeature`): the row is hidden in shops whose trade lacks it. */
export type MenuItem = { id: string; group: MenuGroup; title: string; hint: string; icon: IconName; route: Href; needs: string[]; all?: boolean; trade?: string };

export const GROUP_TITLE: Record<MenuGroup, string> = { dashboard: 'Dashboard', inventory: 'Inventory', stocks: 'Stocks', sales: 'Sales & POS', crm: 'CRM', purchases: 'Purchases', warehouse: 'Warehouse', finance: 'Finance', reports: 'Reports', hrm: 'HRM', roles: 'Roles & Permissions', branches: 'Branches', settings: 'Settings' };
/** The icon at the head of each group, as the web sidebar gives each section its own. */
export const GROUP_ICON: Record<MenuGroup, IconName> = { dashboard: 'Dashboard', inventory: 'Package', stocks: 'Layers', sales: 'Receipt', crm: 'Users', purchases: 'Truck', warehouse: 'Warehouse', finance: 'Cash', reports: 'BarChart', hrm: 'Briefcase', roles: 'ShieldCheck', branches: 'Store', settings: 'Sliders' };
const ORDER: MenuGroup[] = ['dashboard', 'inventory', 'stocks', 'sales', 'crm', 'purchases', 'warehouse', 'finance', 'reports', 'hrm', 'roles', 'branches', 'settings'];

export const MENU: MenuItem[] = [
  { id: 'dashboard', group: 'dashboard', title: 'Dashboard', hint: 'Today at a glance', icon: 'Dashboard', route: '/', needs: ['dashboard.view', 'report.sales', 'sale.view'] },
  { id: 'products', group: 'inventory', title: 'Products List', hint: 'See and change prices and offers', icon: 'Package', route: '/products', needs: ['product.view'] },
  { id: 'add-product', group: 'inventory', title: 'Add Products', hint: 'Put a new item in your shop', icon: 'Plus', route: '/add-product', needs: ['product.create'] },
  { id: 'kinds-brands', group: 'inventory', title: 'Categories & Brands', hint: 'Group your items and see what is unused', icon: 'Tag', route: '/kinds-brands', needs: ['category.view', 'brand.view'] },
  { id: 'discounts', group: 'inventory', title: 'Discount', hint: 'The offers running now', icon: 'Percent', route: '/discounts', needs: ['product.view'] },
  { id: 'stock-levels', group: 'stocks', title: 'Stock Levels', hint: 'What is on the shelves now', icon: 'Layers', route: '/stock', needs: ['product.view', 'inventory.view'] },
  { id: 'movements', group: 'stocks', title: 'Stock Movements', hint: 'Every time an item came in, went out or was corrected', icon: 'History', route: '/movements', needs: ['inventory.view_movements'] },
  { id: 'expiry', group: 'stocks', title: 'Expiry', hint: 'What has expired and what is about to', icon: 'TriangleAlert', route: '/expiry', needs: ['inventory.view'], trade: 'expiry' },
  { id: 'pos', group: 'sales', title: 'POS', hint: 'Sell with the camera or by search', icon: 'ScanLine', route: '/sell', needs: ['pos.access', 'sale.create'], all: true },
  { id: 'sales', group: 'sales', title: 'Invoice', hint: 'Find any sale and share the receipt', icon: 'Receipt', route: '/sales', needs: ['sale.view', 'sale.view_own'] },
  { id: 'returns', group: 'sales', title: 'Return & Refunds', hint: 'Open the sale, then tap “Return & Refunds”', icon: 'Undo', route: '/sales', needs: ['sale.refund'] },
  { id: 'counters', group: 'sales', title: 'Counters', hint: 'The till positions in your shops', icon: 'Lock', route: '/counters', needs: ['pos.access'] },
  { id: 'price-check', group: 'sales', title: 'Price Check', hint: 'Scan or type a code to see the price and stock', icon: 'ScanLine', route: '/price-check', needs: ['product.view'] },
  { id: 'quotations', group: 'sales', title: 'Quotations', hint: 'Give a customer a price before they buy', icon: 'Quote', route: '/quotations', needs: ['sale.view'] },
  { id: 'orders', group: 'sales', title: 'Customer Orders', hint: 'Things customers will collect later', icon: 'ShoppingBag', route: '/orders', needs: ['sale.view'] },
  { id: 'customers', group: 'crm', title: 'Customers', hint: 'Your customers and what they owe', icon: 'Users', route: '/customers', needs: ['customer.view'] },
  { id: 'price-groups', group: 'crm', title: 'Price Groups', hint: 'Customers who get an agreed percent off', icon: 'Percent', route: '/price-groups', needs: ['customer.view'] },
  { id: 'refills', group: 'crm', title: 'Refills', hint: 'Customers about to run out', icon: 'History', route: '/refills', needs: ['customer.view'], trade: 'refill' },
  { id: 'add-customer', group: 'crm', title: 'Add Customer', hint: 'Save a name and phone number', icon: 'Users', route: '/add-customer', needs: ['customer.create'] },
  { id: 'new-purchase', group: 'purchases', title: 'New Purchase', hint: 'Write down goods you bought', icon: 'Plus', route: '/new-purchase', needs: ['purchase.create'] },
  { id: 'old-invoices', group: 'purchases', title: 'Old Invoices', hint: 'Supplier bills from before SortPi', icon: 'Receipt', route: '/old-invoices', needs: ['purchase.view'] },
  { id: 'purchases', group: 'purchases', title: 'Purchase History', hint: 'Order, receive and pay for goods', icon: 'Truck', route: '/purchases', needs: ['purchase.view'] },
  { id: 'supplier-returns', group: 'purchases', title: 'Supplier Returns', hint: 'Goods you sent back to suppliers', icon: 'Undo', route: '/supplier-returns', needs: ['purchase.view'] },
  { id: 'suppliers', group: 'purchases', title: 'Suppliers', hint: 'See what you owe each supplier and pay them', icon: 'Store', route: '/suppliers', needs: ['supplier.view'] },
  { id: 'warehouses', group: 'warehouse', title: 'Warehouses', hint: 'The places you keep stock', icon: 'Warehouse', route: '/warehouses', needs: ['warehouse.view'] },
  { id: 'transfers', group: 'warehouse', title: 'Transfers', hint: 'Goods sent between your branches or shelves', icon: 'ArrowUpRight', route: '/transfers', needs: ['inventory.transfer'] },
  { id: 'stock-count', group: 'warehouse', title: 'Stock Count', hint: 'Check the shelves and fix the numbers', icon: 'ClipboardCheck', route: '/stock-count', needs: ['inventory.adjust'] },
  { id: 'money', group: 'finance', title: 'Income & Expense', hint: 'Write down rent, tea and other money in or out', icon: 'Cash', route: '/money', needs: ['income.view', 'expense.view'], all: true },
  { id: 'vouchers', group: 'finance', title: 'Vouchers', hint: 'Every money in and out, one by one', icon: 'Receipt', route: '/money', needs: ['income.view', 'expense.view'], all: true },
  { id: 'regular', group: 'finance', title: 'Regular Payments', hint: 'Rent and bills that repeat', icon: 'History', route: '/regular-payments', needs: ['income.view', 'expense.view'] },
  { id: 'transfers-money', group: 'finance', title: 'Account Transfers', hint: 'Move money between cash and bank', icon: 'ArrowUpRight', route: '/account-transfers', needs: ['account.view'] },
  { id: 'accounts', group: 'finance', title: 'Accounts', hint: 'Cash, bank and what each holds', icon: 'Bank', route: '/accounts', needs: ['account.view'] },
  { id: 'reports', group: 'reports', title: 'All Reports', hint: 'Sales, profit, who owes whom', icon: 'BarChart', route: '/reports', needs: ['report.sales', 'finance.view_pl', 'report.finance'] },
  { id: 'end-shift', group: 'reports', title: 'Day Close', hint: 'Count the cash and finish for today', icon: 'Lock', route: '/end-shift', needs: ['pos.shift_close'] },
  { id: 'team', group: 'hrm', title: 'Employees', hint: 'Who works for you, and who is in today', icon: 'Users', route: '/team', needs: ['hrm.view'] },
  { id: 'attendance', group: 'hrm', title: 'Attendance', hint: 'Mark who is in today', icon: 'ClipboardCheck', route: '/team', needs: ['hrm.view'] },
  { id: 'payroll', group: 'hrm', title: 'Payroll', hint: 'Who is owed their wage, and pay them', icon: 'Cash', route: '/payroll', needs: ['hrm.view'] },
  { id: 'shifts', group: 'hrm', title: 'Shifts', hint: 'Each till shift, and what the cash came to', icon: 'Lock', route: '/shifts', needs: ['pos.access'] },
  { id: 'access', group: 'roles', title: 'Users & Roles', hint: 'Who can use the app, and what they may do', icon: 'ShieldCheck', route: '/access', needs: ['user.view', 'role.view', 'branch.view'] },
  { id: 'activity', group: 'roles', title: 'Activity Log', hint: 'What happened in your shop, and who did it', icon: 'Activity', route: '/activity', needs: ['audit.view'] },
  { id: 'branches', group: 'branches', title: 'Branches', hint: 'Your shops and their details', icon: 'Store', route: { pathname: '/access', params: { tab: 'branches' } }, needs: ['branch.view'] },
  { id: 'shop-settings', group: 'settings', title: 'Settings', hint: 'VAT, discount, daily target, ways to pay', icon: 'Sliders', route: '/shop-settings', needs: ['settings.view'] },
  { id: 'plan', group: 'settings', title: 'Plan & billing', hint: 'Your SortPi plan, what you use, and how to move up', icon: 'CreditCard', route: '/plan', needs: ['billing.view'] },
];

/** What this person may open, matched against what they typed in the words they see (`tr` translates a title or hint). */
export function visibleMenu(items: MenuItem[], permissions: string[] | undefined, query: string, tr: (text: string) => string, trades?: readonly string[]): MenuItem[] {
  const q = query.trim().toLowerCase();
  return items
    .filter((i) => (i.all ? i.needs.every((p) => permissions?.includes(p)) : i.needs.some((p) => permissions?.includes(p))))
    .filter((i) => !i.trade || !!trades?.includes(i.trade))
    .filter((i) => !q || [i.title, tr(i.title), tr(i.hint)].some((s) => s.toLowerCase().includes(q)));
}

/** Items in group order, each group once, empty groups left out. */
export function groupMenu(items: MenuItem[]): { group: MenuGroup; items: MenuItem[] }[] {
  return ORDER.map((group) => ({ group, items: items.filter((i) => i.group === group) })).filter((g) => g.items.length > 0);
}
