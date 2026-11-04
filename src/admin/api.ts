import { api } from '@/api/session';

/** Checked live on the local API. */
export type UserRow = { id: string; email: string; full_name: string; phone: string; is_active: boolean; roles: string[]; last_login: string | null };
export type RoleRow = { id: string; name: string; description: string; is_system: boolean; permissions: string[] };
export type BranchRow = { id: string; code: string; name: string; phone: string; address: string; is_active: boolean };
export type AuditRow = { id: string; actor_email: string; action: string; entity_type: string; old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null; note: string; created_at: string };

const PAGE = 25;
const more = (page: number, total_pages?: number) => (page < (total_pages ?? 1) ? page + 1 : undefined);

/** The people who can sign in. Needs `user.view`. Passwords and permission details are not on this list. */
export async function listUsers(page: number) {
  const env = await api.envelope<UserRow[]>('GET', '/users/', { query: { limit: PAGE, page } });
  return { rows: env.data ?? [], total: env.meta?.total ?? 0, nextPage: more(page, env.meta?.total_pages) };
}
/** Needs `role.view`. */
export const listRoles = () => api.get<RoleRow[]>('/roles/', { query: { limit: 100 } });
/** Needs `branch.view`. */
export const listBranches = () => api.get<BranchRow[]>('/branches/', { query: { limit: 100 } });
/** The activity log, newest first; one `action` at a time. Needs `audit.view`. */
export async function listActivity(o: { action?: string; page: number }) {
  const env = await api.envelope<AuditRow[]>('GET', '/audit-logs/', { query: { limit: PAGE, page: o.page, action: o.action } });
  return { rows: env.data ?? [], nextPage: more(o.page, env.meta?.total_pages) };
}
