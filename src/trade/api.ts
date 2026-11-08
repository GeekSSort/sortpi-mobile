import { api } from '@/api/session';

export type Method = 'CASH' | 'CARD' | 'BANK' | 'MOBILE';
/** A gift card (checked on the OpenAPI file). Reading needs `sale.view`; selling `sale.create`; paying out `sale.refund`; voiding `sale.cancel`. */
export type GiftCard = { id: string; code: string; initial_value: string; balance: string; expires_on: string | null; is_active: boolean; customer_id: string | null; issue_payment_method: string; note: string; created_at: string };
export async function listGiftCards(page: number) {
  const env = await api.envelope<GiftCard[]>('GET', '/gift-cards/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export const findGiftCard = (code: string) => api.get<GiftCard>('/gift-cards/lookup/', { query: { code } });
export const sellGiftCard = (b: { value: string; payment_method: Method; code?: string; expires_on?: string; note?: string }, idempotencyKey: string) => api.post<GiftCard>('/gift-cards/', b, { idempotencyKey });
export const payOutGiftCard = (id: string, b: { payment_method: 'CASH' | 'BANK' | 'MOBILE'; amount?: string }) => api.post<GiftCard>(`/gift-cards/${id}/pay-out/`, b);
export const voidGiftCard = (id: string) => api.post<GiftCard>(`/gift-cards/${id}/void/`);

export type Instalment = { id: string; sale_id: string; invoice_number: string; customer_name: string; customer_phone: string; financed: string; months: number; paid: string; outstanding: string; overdue: string; next_due_date: string | null; next_amount: string; instalments_paid: number; settled: boolean };
export async function listInstalments(o: { overdueOnly: boolean; page: number }) {
  const env = await api.envelope<Instalment[]>('GET', '/instalment-plans/', { query: { limit: 25, page: o.page, overdue: o.overdueOnly ? 1 : undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
/** Takes an instalment from the customer. Needs `customer.payment`. */
export const collectInstalment = (id: string, b: { amount: string; payment_method: string }, idempotencyKey: string) => api.post<Instalment>(`/instalment-plans/${id}/collect/`, b, { idempotencyKey });
/** Puts a credit sale on instalments. Needs `sale.create`. */
export const planInstalments = (b: { sale_id: string; months: number; first_due: string; note?: string }) => api.post<Instalment>('/instalment-plans/', b);

export type DeliveryStatus = 'PENDING' | 'OUT' | 'DELIVERED' | 'FAILED' | string;
export type Delivery = { id: string; reference_no: string; sale_id: string; invoice_number: string; customer_name: string; address: string; phone: string; rider: string; status: DeliveryStatus; cash_to_collect: string; cash_collected: string; installation_required: boolean; installed_at: string | null };
export async function listDeliveries(o: { status: string | null; page: number }) {
  const env = await api.envelope<Delivery[]>('GET', '/deliveries/', { query: { limit: 25, page: o.page, status: o.status ?? undefined } });
  return { rows: env.data ?? [], nextPage: o.page < (env.meta?.total_pages ?? 1) ? o.page + 1 : undefined };
}
/** Moves a delivery on: out with a rider, delivered (with any cash taken) or failed. Needs `sale.create`. */
export const stepDelivery = (id: string, b: { status: 'OUT' | 'DELIVERED' | 'FAILED'; rider?: string; cash?: string; payment_method?: string; note?: string }) => api.post<Delivery>(`/deliveries/${id}/step/`, b);
export const markInstalled = (id: string, installed_by: string) => api.post<Delivery>(`/deliveries/${id}/installed/`, { installed_by });
export const sendForDelivery = (b: { sale_id: string; address: string; phone?: string; rider?: string }) => api.post<Delivery>('/deliveries/', b);

export type TradeIn = { id: string; customer_name: string; device: string; imei: string; condition: string; value: string; metal: string; purity: string; weight: string; created_at: string };
export async function listTradeIns(page: number) {
  const env = await api.envelope<TradeIn[]>('GET', '/trade-ins/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export const takeTradeIn = (b: { customer_id: string; device: string; imei?: string; condition?: string; value?: string }) => api.post<TradeIn>('/trade-ins/', b);

export type CommissionRow = { id: string; kind: string; name: string; sales: number; net_sales: string; rate: string; commission: string };
/** What each salesperson earned over a period. */
export const commissionReport = (from: string, to: string) => api.get<CommissionRow[]>('/sales/commission/', { query: { date_from: from, date_to: to } });
