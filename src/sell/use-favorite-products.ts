import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useRef, useState } from 'react';

import type { CatalogItem } from './catalog-map';

export type Favorite = Pick<CatalogItem, 'variantId' | 'sku' | 'name'>;

export function useFavoriteProducts(organization?: string, branch?: string) {
  const client = useQueryClient();
  const key = `sortpi.favorites.${organization ?? 'none'}.${branch ?? 'all'}`;
  const queryKey = ['sell', 'favorites', key] as const;
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Favorite[]> => {
      try {
        const data: unknown = JSON.parse(await SecureStore.getItemAsync(key) ?? '[]');
        return Array.isArray(data) ? data.filter((x): x is Favorite => !!x && typeof x.variantId === 'string' && typeof x.sku === 'string' && typeof x.name === 'string') : [];
      } catch {
        return [];
      }
    },
    enabled: !!organization,
    staleTime: Infinity,
  });
  const favorites = query.data ?? [];
  async function toggle(item: Favorite) {
    if (!organization || busy.current || query.isPending) return;
    const saved = client.getQueryData<Favorite[]>(queryKey) ?? [];
    const next = saved.some((x) => x.variantId === item.variantId)
      ? saved.filter((x) => x.variantId !== item.variantId)
      : [...saved, { variantId: item.variantId, sku: item.sku, name: item.name }];
    busy.current = true;
    setSaving(true);
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(next));
      client.setQueryData(queryKey, next);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return { favorites, toggle, busy: saving || query.isPending };
}
