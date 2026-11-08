import { api } from '@/api/session';

/** A message from the shop's system (checked on the OpenAPI file and the live local API). Reading needs `notification.view`; marking read `notification.update`. */
export type Notice = { id: string; event: string; title: string; message: string; entity_type: string; entity_id: string; is_read: boolean; read_at: string | null; created_at: string };

export async function listNotices(page: number) {
  const env = await api.envelope<Notice[]>('GET', '/notifications/', { query: { limit: 25, page } });
  return { rows: env.data ?? [], nextPage: page < (env.meta?.total_pages ?? 1) ? page + 1 : undefined };
}
export const unreadCount = async () => (await api.get<{ count: number }>('/notifications/unread-count/')).count;
export const markRead = (ids: string[]) => api.post<unknown>('/notifications/mark-read/', { notification_ids: ids });
export const markAllRead = () => api.post<unknown>('/notifications/mark-all-read/');
