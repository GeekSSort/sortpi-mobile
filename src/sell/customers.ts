import { api } from '@/api/session';

export type PickedCustomer = { id: string; name: string; phone: string; wholesale: boolean; balance: string; creditLimit: string };
type Row = { id: string; name: string; phone: string; customer_type: string; current_balance: string; credit_limit: string; code?: string };

/** Customers to pick from at the till. Needs `customer.view`; the walk-in record is left out, "no customer" already means walk-in. */
export async function searchCustomers(search: string): Promise<PickedCustomer[]> {
  const rows = await api.get<Row[]>('/customers/', { query: { limit: 20, search: search.trim() || undefined } });
  return rows
    .filter((r) => (r.code ?? '').toUpperCase() !== 'CUS-WALKIN')
    .map((r) => ({ id: r.id, name: r.name, phone: r.phone, wholesale: r.customer_type === 'WHOLESALE', balance: r.current_balance, creditLimit: r.credit_limit }));
}
