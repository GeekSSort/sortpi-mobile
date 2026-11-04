import { api } from '@/api/session';

import type { DayClose, PnL } from './logic';

/** Checked live. Money is text. `cost_of_goods` and `gross_profit` are absent (never null) unless the person holds `sale.view_profit`. */
export type Window = { from_date: string; to_date: string };
export type Summary = { sale_count: number; revenue: string; gross_revenue: string; return_count: number; returns_total: string; total_paid: string; total_due: string; cost_of_goods?: string; gross_profit?: string };
export type DailyRow = { date: string; revenue: string; sale_count: number; gross_profit?: string };
export type ProductRow = { variant_id: string; sku: string; product_name: string; variant_name: string; quantity_sold: string; revenue: string; gross_profit?: string };
export type KindRow = { category_id: string; category_name: string; quantity_sold: string; revenue: string; gross_profit?: string };
export type TenderRow = { method: string; label: string; amount: string; payment_count: number; share: string };
export type DueRow = { outstanding: string } & ({ customer_id: string; customer_name: string } | { supplier_id: string; supplier_name: string });

const q = (w: Window) => ({ query: w });
/** Sales figures for a window. Needs `report.sales`. */
export const salesSummary = (w: Window) => api.get<Summary>('/sales/summary/', q(w));
export const salesDaily = (w: Window) => api.get<DailyRow[]>('/sales/daily/', q(w));
export const bestSellers = (w: Window) => api.get<ProductRow[]>('/sales/by-product/', { query: { ...w, limit: 5 } });
export const salesByKind = (w: Window) => api.get<KindRow[]>('/sales/by-category/', q(w));
export const howPaid = (w: Window) => api.get<TenderRow[]>('/sales/by-payment-method/', q(w));
/** Profit statement. Needs `finance.view_pl` (not `report.*`: a branch manager holds every report code but not this). */
export const profitAndLoss = (w: Window) => api.get<PnL>('/finance/pnl/', q(w));
/** What is owed right now (the window does not narrow it). Needs `report.finance`. */
export const customerDue = () => api.get<Extract<DueRow, { customer_id: string }>[]>('/finance/customer-due/');
export const supplierDue = () => api.get<Extract<DueRow, { supplier_id: string }>[]>('/finance/supplier-due/');
/** One day's takings on one sheet. Needs `report.sales`. */
export const dayClose = (date: string) => api.get<DayClose>('/sales/day-close/', { query: { date } });
