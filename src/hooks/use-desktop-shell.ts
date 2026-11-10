import { usePathname } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

import { isDesktopShell, shellSidebarWidth } from '@/ui/landscape';
import { useTillFocus } from '@/ui/till-focus';

/** True when the screen is wide enough for the always-open side menu, wherever the person is. */
export function useShellAvailable(): boolean {
  const { width, height } = useWindowDimensions();
  return isDesktopShell(Platform.OS, width, height);
}

/**
 * True when the side menu stays open beside the screen. The till is the exception, like the web's: it has its own toolbar and takes
 * the whole screen, and so does its full-screen mode.
 */
export function useDesktopShell(): boolean {
  const available = useShellAvailable();
  const tillFocus = useTillFocus();
  const onTill = usePathname().startsWith('/sell');
  return available && !tillFocus && !onTill;
}

/** How wide the always-open menu is right now: 0 when it is not shown. */
export function useShellSidebarWidth(): number {
  const { width } = useWindowDimensions();
  return useDesktopShell() ? shellSidebarWidth(width) : 0;
}
