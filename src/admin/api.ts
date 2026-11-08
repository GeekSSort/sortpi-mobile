import { api } from '@/api/session';

/** Checked live on the local API. */
export type UserRow = { id: string; email: string; full_name: string; phone: string; is_active: boolean; roles: string[]; branches?: string[]; last_login: string | null };
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

/** Needs `branch.create`. */
export const createBranch = (body: unknown) => api.post<BranchRow>('/branches/', body);
/** Needs `branch.update`. */
export const updateBranch = (id: string, body: unknown) => api.patch<BranchRow>(`/branches/${id}/`, body);
/** Needs `branch.delete`. The server refuses a branch that has records. */
export const deleteBranch = (id: string) => api.delete<void>(`/branches/${id}/`);

import type { Perm } from '@/roles/logic';

/** Every permission the server knows, with a plain description. Needs `role.view`. The list is capped at 200 per page and has 132. */
export const listPermissions = () => api.get<Perm[]>('/permissions/', { query: { limit: 200 } });
/** Needs `role.create`. `permissions` are codes. */
export const createRole = (body: { name: string; description: string; permissions: string[] }) => api.post<RoleRow>('/roles/', body);
/** Needs `role.update`. The permission list is replaced. */
export const updateRole = (id: string, body: { name: string; description: string; permissions: string[] }) => api.patch<RoleRow>(`/roles/${id}/`, body);
/** Needs `role.delete`. */
export const deleteRole = (id: string) => api.delete<void>(`/roles/${id}/`);

/** A user's roles are sent by NAME and their branches by id (checked live). Creating needs `user.create` and a password. */
export type UserBody = { full_name: string; phone: string; roles: string[]; branches: string[] };
export const createUser = (body: UserBody & { email: string; password: string }) => api.post<UserRow>('/users/', { ...body, is_active: true });
/** Needs `user.update`. */
export const updateUser = (id: string, body: Partial<UserBody> & { is_active?: boolean }) => api.patch<UserRow>(`/users/${id}/`, body);
/** Deactivates (checked live: they stay on record, cannot sign in, and a PATCH `is_active: true` brings them back). Needs `user.delete`. */
export const deactivateUser = (id: string) => api.delete<void>(`/users/${id}/`);
/** Emails the person a link to choose their own password. Needs `user.create`. */
export const inviteUser = (id: string) => api.post<unknown>(`/users/${id}/invite/`);

/** One person by id. Needs `user.view`. */
export const getUser = (id: string) => api.get<UserRow>(`/users/${id}/`);
