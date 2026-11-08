import { api } from '@/api/session';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
/** A ledger account (checked live). `balance` is the ledger's and is never sent. Reading needs `account.view`. */
export type Account = { id: string; code: string; name: string; account_type: AccountType; balance: string; is_active: boolean; description: string };
export type AccountTx = { id: string; date: string; reference_type: string; debit: string; credit: string; balance_after: string; description: string };
export type Transfer = { id: string; from_account: string; from_account_code: string; from_account_name: string; to_account: string; to_account_code: string; to_account_name: string; amount: string; date: string; reference_no: string; description: string };

export const listAccounts = () => api.get<Account[]>('/accounts/', { query: { limit: 200 } });
export const getAccount = (id: string) => api.get<Account>(`/accounts/${id}/`);
/** Needs `account.create`. */
export const createAccount = (body: { code: string; name: string; account_type: AccountType; description: string }) => api.post<Account>('/accounts/', { ...body, is_active: true });
/** Needs `account.update`. The type cannot be changed once there are entries, so it is not sent. */
export const updateAccount = (id: string, body: Partial<Pick<Account, 'name' | 'description' | 'is_active'>>) => api.patch<Account>(`/accounts/${id}/`, body);
/** Needs `account.delete`; checked live: gone from every list afterwards. */
export const deleteAccount = (id: string) => api.delete<void>(`/accounts/${id}/`);

/** One page of an account's entries, newest first. */
export async function listAccountTx(accountId: string, page: number) {
  const env = await api.envelope<AccountTx[]>('GET', '/account-transactions/', { query: { account: accountId, limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}

export async function listTransfers(page: number) {
  const env = await api.envelope<Transfer[]>('GET', '/account-transfers/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
/** Moves money between two money accounts, posting both ledger rows. Needs `finance.manage_accounts`. */
export const createTransfer = (body: { from_account: string; to_account: string; amount: string; date: string; description: string }, idempotencyKey: string) => api.post<Transfer>('/account-transfers/', body, { idempotencyKey });
/** Voids a transfer: both ledger rows are reversed and the document is removed. Needs `finance.manage_accounts`. */
export const voidTransfer = (id: string) => api.delete<void>(`/account-transfers/${id}/`);
