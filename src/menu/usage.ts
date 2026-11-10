import * as SecureStore from 'expo-secure-store';

export type Usage = Record<string, number>;

const keyFor = (userId: string) => `sortpi.menu.usage.${userId}`;
const cache = new Map<string, Usage>();

/** How many times this person opened each menu task on this phone. */
export async function loadUsage(userId: string): Promise<Usage> {
  try {
    const raw = await SecureStore.getItemAsync(keyFor(userId));
    const saved = raw ? (JSON.parse(raw) as Usage) : {};
    cache.set(userId, saved);
    return saved;
  } catch {
    return cache.get(userId) ?? {};
  }
}

/** Counts one opening. The top buttons are not reordered until the next start, so they stay where the person learned them. */
export function bumpUsage(userId: string | undefined, id: string): void {
  if (!userId) return;
  void (async () => {
    const now = cache.get(userId) ?? (await loadUsage(userId));
    const next = { ...now, [id]: (now[id] ?? 0) + 1 };
    cache.set(userId, next);
    try { await SecureStore.setItemAsync(keyFor(userId), JSON.stringify(next)); } catch { /* the count is a convenience */ }
  })();
}
