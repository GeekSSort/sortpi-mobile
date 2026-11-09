import { api } from '@/api/session';
import type { ProductRow } from '@/reports/api';
import type { StockSummary } from '@/stock/api';

import type { Sale } from '@/sales/api';

export type DashboardRange = { from_date: string; to_date: string };
type DashboardBundle = {
  sales_summary?: { revenue: string; total_due: string };
  finance_pnl?: { net_profit: string; expenses: string };
  purchase_summary?: { purchase_count: number; total_due: string };
};
type CustomerRank = { customer_id: string | null; customer_name: string; sale_count: number; paid: string };
type ActivitySale = Pick<Sale, 'id' | 'invoice_number' | 'customer_name' | 'sale_date' | 'grand_total' | 'due_amount' | 'status'> & Partial<Pick<Sale, 'items' | 'payments'>>;
type SalesDay = { day?: string; date?: string; revenue: string; gross_profit?: string; expenses?: string };

export const dashboardBundle = (branch_id?: string, range?: DashboardRange) =>
  api.get<DashboardBundle>('/dashboard/', { query: { branch_id, ...range } });

export const dashboardStock = (branch_id?: string) =>
  api.get<StockSummary>('/inventory/stock/summary/', { query: { branch_id } });

export const dashboardProducts = (branch_id?: string, range?: DashboardRange) =>
  api.get<ProductRow[]>('/sales/by-product/', { query: { branch_id, ...range, limit: 5 } });

export const dashboardCustomers = (branch_id?: string, range?: DashboardRange) =>
  api.get<CustomerRank[]>('/sales/by-customer/', { query: { branch_id, ...range } });

export const dashboardActivity = (branch_id?: string, range?: DashboardRange) =>
  api.get<ActivitySale[]>('/sales/', { query: { branch_id, date_from: range?.from_date, date_to: range?.to_date, limit: 5 } });

export const dashboardSalesDays = (branch_id: string | undefined, range: DashboardRange) =>
  api.get<SalesDay[]>('/sales/daily/', { query: { branch_id, ...range } });
