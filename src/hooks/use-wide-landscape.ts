import { Platform, useWindowDimensions } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { useDesktopShell } from '@/hooks/use-desktop-shell';
import { isWideAndroidLandscape } from '@/ui/landscape';

/**
 * `contentWidth` is for lists, report grids and forms: on the very wide screen they fill the space beside the menu.
 * `readingWidth` is for single-column detail pages, which stay in a centred column so a line does not run the whole screen.
 */
export function useWideLandscape() {
  const { width, height } = useWindowDimensions();
  const desktopShell = useDesktopShell();
  const wideLandscape = isWideAndroidLandscape(Platform.OS, width, height);
  const contentWidth = wideLandscape ? (desktopShell ? 2400 : 1280) : MaxContentWidth;
  const readingWidth = wideLandscape ? (desktopShell ? 1440 : 1280) : MaxContentWidth;
  return { wideLandscape, desktopShell, contentWidth, readingWidth };
}
