export function isWideAndroidLandscape(platform: string, width: number, height: number): boolean {
  return platform === 'android' && width >= 900 && height >= 480 && width > height;
}

/** Tablets and wider, held sideways (an 8-inch tablet is about 960 dp across), keep the side menu open all the time instead of hiding it behind ☰. */
export function isDesktopShell(platform: string, width: number, height: number): boolean {
  return platform === 'android' && width >= 900 && height >= 480 && width > height;
}

/** The open menu is a little narrower on a small tablet, so the page beside it keeps its room. */
export const shellSidebarWidth = (width: number): number => (width >= 1100 ? 264 : 232);
