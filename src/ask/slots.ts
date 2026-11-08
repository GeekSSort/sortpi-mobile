import { nameWords } from './banglish.ts';
import type { Period, Plan } from './plan.ts';

/**
 * The slot parser. Owners ask for one thing (what), over a period (when), sometimes about one item. Read from the folded words, this gives
 * the same Plan the model writes, without a model: so "ei mashe kon category beshi bikri" and "bkash e koto ashche" need no stored sentence.
 * It answers only when it is sure of what is asked; everything else goes on to the word matcher and then the model.
 */
export function periodOf(w: Set<string>): Period | null {
  if (w.has('gotokal') && !w.has('last')) return 'yesterday';
  if (w.has('mash')) return 'month';
  if (w.has('week')) return 'week';
  if (w.has('gotokal')) return 'yesterday';
  if (w.has('ajker')) return 'today';
  return null;
}

export function slotPlan(norm: string): Plan | null {
  const w = new Set(norm.split(' ').filter(Boolean));
  const period = periodOf(w);
  const make = (tool: Plan['tool'], p: Period | null = period, extra: Partial<Plan> = {}): Plan => ({ tool, period: p ?? 'today', item: '', name: '', ...extra });
  const sale = w.has('sale') || w.has('bill');

  if (w.has('order')) return make('orders_due', period ?? 'week'); // "dite hobe" here is "has to be handed over", not a forecast
  if (w.has('will') || w.has('advice') || w.has('event')) return null; // forecasts and advice are not lookups
  if (w.has('category') && (sale || w.has('top'))) return make('sales_by_category');
  if (w.has('cashier')) return make('sales_by_cashier');
  if (w.has('branch')) return make('sales_by_branch');
  if (sale && w.has('daily')) return make('sales_by_day');
  if (w.has('pay') && !w.has('stock') && !w.has('price')) return make('sales_by_payment');
  if (w.has('profit') && !w.has('baki')) return make('profit');
  if (w.has('bill') && w.has('dekhao') && !w.has('koto')) return make('bills');
  if (sale && w.has('koto') && period === 'month') return make('sales_total');
  if (sale && (w.has('koto') || w.has('dekhao'))) {
    const item = nameWords(norm).join(' ');
    if (item && !w.has('top')) return make('item_sales', period, { item });
  }
  return null;
}
