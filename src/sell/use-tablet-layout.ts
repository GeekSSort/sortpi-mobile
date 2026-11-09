import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';

import { useSession } from '@/auth/session-provider';
import { resolvedSettings } from '@/settings/api';

import { tabletLayout, type TabletLayout } from './tablet-layout';

export function useTabletLayout(enabled: boolean) {
  const { me } = useSession();
  const client = useQueryClient();
  const [saving, setSaving] = useState(false);
  const org = me?.organization.id;
  const branch = me?.active_branch?.id;
  const key = `sortpi.pos.layout.${org ?? 'none'}.${branch ?? 'all'}`;
  const localKey = ['sell', 'tablet-layout', key] as const;
  const local = useQuery({
    queryKey: localKey,
    queryFn: () => SecureStore.getItemAsync(key),
    enabled: enabled && !!org,
    staleTime: Infinity,
  });
  const shop = useQuery({
    queryKey: ['settings', 'resolved', 'tablet', org, branch],
    queryFn: resolvedSettings,
    enabled: enabled && !!org && !!me?.permissions?.includes('settings.view'),
    staleTime: 30_000,
  });
  const deviceLayout = tabletLayout(local.data);
  const shopLayout = tabletLayout(shop.data?.find((row) => row.key === 'pos.layout')?.value);

  async function choose(value: TabletLayout | null) {
    setSaving(true);
    try {
      if (value === null) await SecureStore.deleteItemAsync(key);
      else await SecureStore.setItemAsync(key, value);
      client.setQueryData(localKey, value);
    } finally {
      setSaving(false);
    }
  }

  return { layout: deviceLayout ?? shopLayout ?? 'wall', deviceLayout, choose, busy: saving || local.isFetching };
}
