import { Stack } from 'expo-router/stack';

import { useT } from '@/i18n/prefs';

import { useHeaderOptions } from './header-options';

/** One native stack per tab, so every tab page gets a real header with a title and room for an action. */
export function TabStack({ title }: { title: string }) {
  const header = useHeaderOptions();
  const t = useT();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: t(title) }} />
    </Stack>
  );
}
