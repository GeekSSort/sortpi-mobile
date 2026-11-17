/**
 * How big a product photo needs to be. A shelf item is shown in a small card and a list row, never full screen, so the long side
 * of 1280 px is more than enough; a phone camera gives 4000 to 8000 px and several megabytes, which only costs storage and upload time.
 */
export const PHOTO_MAX_SIDE = 1280;
/** JPEG quality for the saved copy: small, with no visible loss at card size. */
export const PHOTO_QUALITY = 0.7;

/** The size to shrink to so the long side is `maxSide`, keeping the shape; null when it already fits (or the size is not known). */
export function fitWithin(width: number | undefined, height: number | undefined, maxSide: number = PHOTO_MAX_SIDE): { width: number; height: number } | null {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const long = Math.max(width, height);
  if (long <= maxSide) return null;
  const scale = maxSide / long;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
