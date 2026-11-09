export function isWideAndroidLandscape(platform: string, width: number, height: number): boolean {
  return platform === 'android' && width >= 900 && height >= 480 && width > height;
}
