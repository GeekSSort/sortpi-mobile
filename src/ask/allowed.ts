import type { IntentId } from './intents.ts';

/** Any one of these permission codes lets a person ask the question. The same codes the screens behind each answer need. */
const NEEDS: Record<IntentId, string[]> = {
  sales_today: ['dashboard.view', 'report.sales', 'sale.view'],
  sales_yesterday: ['dashboard.view', 'report.sales', 'sale.view'],
  sales_week: ['dashboard.view', 'report.sales', 'sale.view'],
  low_stock: ['product.view', 'inventory.view'],
  out_of_stock: ['product.view', 'inventory.view'],
  product_stock: ['product.view', 'inventory.view'],
  stock_summary: ['product.view', 'inventory.view'],
  product_price: ['product.view', 'inventory.view', 'pos.access'],
  top_products: ['report.sales'],
  bills_today: ['sale.view', 'sale.view_own'],
  due_amount: ['report.finance'],
  supplier_due: ['report.finance'],
  profit_today: ['sale.view_profit'],
  payments_today: ['report.sales'],
  start_selling: ['pos.access'],
  customer_balance: ['customer.view'],
  metal_rates: ['product.view', 'inventory.view'],
  expiring_soon: ['inventory.view'],
  expired_stock: ['inventory.view'],
  orders_due: ['sale.view'],
};

export const allowed = (intent: IntentId, perms: readonly string[] | undefined): boolean => NEEDS[intent].some((c) => perms?.includes(c));
