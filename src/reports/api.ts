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

/** One row per cashier or per branch. Needs `report.sales`. `gross_profit` only with `sale.view_profit`. */
export type PersonRow = { sale_count: number; revenue: string; gross_profit?: string } & ({ cashier_id: string; cashier_name: string } | { branch_id: string; branch_name: string });
/** One stock movement behind "stock written off". Needs `finance.view_pl`. `loss` is negative when stock was found. */
export type WriteOffRow = { date: string; reference_no: string; reason: string; warehouse_name: string; product_name: string; variant_name: string; quantity: string; loss: string };

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
export const salesByCashier = (w: Window) => api.get<Extract<PersonRow, { cashier_id: string }>[]>('/sales/by-cashier/', q(w));
export const salesByBranch = (w: Window) => api.get<Extract<PersonRow, { branch_id: string }>[]>('/sales/by-branch/', q(w));
export const stockWrittenOff = (w: Window) => api.get<WriteOffRow[]>('/finance/stock-write-offs/', q(w));
