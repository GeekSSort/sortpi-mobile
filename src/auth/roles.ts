/**
 * Which tabs a person sees, and which one opens first. Pure logic, unit-tested.
 *
 * Follows the intent of the web app's `homeFor` (saas/client/src/services/authService.ts): a person
 * lands where they can work with data, never on a screen of refusals, and a cashier's home is the till.
 * It does not copy `homeFor`'s output, which today sends a Cashier to "new quotation" and Inventory to
 * "production" because of how its page list is ordered. Permission codes are the server's own registry.
 */
export type TabId = 'index' | 'sell' | 'stock' | 'customers' | 'more';

type Perms = readonly string[];
const any = (p: Perms, codes: string[]) => codes.some((c) => p.includes(c));

/** Home is the dashboard. Anyone who can read shop-wide sales figures gets it. */
export const canSeeHome = (p: Perms) => any(p, ['dashboard.view', 'report.sales', 'sale.view']);
/** Sell is the till. It needs the right to open it AND to make a sale. */
export const canSell = (p: Perms) => p.includes('pos.access') && p.includes('sale.create');
/** Stock lookup (and price check) is open to anyone who can read products or stock. */
export const canSeeStock = (p: Perms) => any(p, ['product.view', 'inventory.view']);
export const canSeeCustomers = (p: Perms) => p.includes('customer.view');

export function visibleTabs(p: Perms): TabId[] {
  const tabs: TabId[] = [];
  if (canSeeHome(p)) tabs.push('index');
  if (canSell(p)) tabs.push('sell');
  if (canSeeStock(p)) tabs.push('stock');
  if (canSeeCustomers(p)) tabs.push('customers');
  tabs.push('more'); // everyone has a profile and sign out
  return tabs;
}

/** The tab to open first: the dashboard if they have one, else the till, else stock, else customers. */
export function landingTab(p: Perms): TabId {
  return visibleTabs(p)[0];
}
