import { api } from '@/api/session';

/** A kind of customer sold to at an agreed percent off (checked on the OpenAPI file). Reading needs `customer.view`; changes need `customer.update`. */
export type PriceGroup = { id: string; name: string; discount_percent: string; is_active: boolean };
export type Refill = { customer_id: string; customer_name: string; phone: string; whatsapp: string; product_name: string; variant_name: string; variant_id: string; last_bought: string; quantity: string; supply_days: number; due_on: string; days_left: number; contacted_at: string | null; contact_note: string };
export type DiscountSummary = { active_offers: number; products_on_offer: number; average_percent: string; deepest_percent: string; deepest_product: string };
export type OfferRow = { id: string; variant: string; sku: string; product_name: string; branch: string | null; mode: 'PERCENT' | 'FLAT'; value: string; is_active: boolean; ends_on: string | null };

export const listPriceGroups = () => api.get<PriceGroup[]>('/price-groups/', { query: { limit: 100 } });
export const createPriceGroup = (b: { name: string; discount_percent: string }) => api.post<PriceGroup>('/price-groups/', { ...b, is_active: true });
export const updatePriceGroup = (id: string, b: Partial<PriceGroup>) => api.patch<PriceGroup>(`/price-groups/${id}/`, b);
/** Its customers are left without a group. */
export const deletePriceGroup = (id: string) => api.delete<void>(`/price-groups/${id}/`);

/** Customers whose last purchase runs out between `overdue` days ago and `within` days ahead. Only for trades with refills (else 404). Needs `customer.view`. */
export const listRefills = (within: number, overdue: number) => api.get<Refill[]>('/customers/refills/', { query: { within, overdue, limit: 100 } });
/** Says the customer was told. Saying it twice changes nothing. Needs `customer.update`. */
export const markTold = (r: Refill, note = '') => api.post<unknown>('/customers/refills/contacted/', { customer: r.customer_id, variant: r.variant_id, due_on: r.due_on, note });

export const discountSummary = () => api.get<DiscountSummary>('/products/discounts/summary/');
export const listOffers = () => api.get<OfferRow[]>('/products/discounts/', { query: { limit: 500 } });
