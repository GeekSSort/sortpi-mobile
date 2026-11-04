import { ApiError } from '../api/client.ts';
import { describeSettingsError } from './logic.ts';

/** The server keeps a logo to 2 MB and to these picture types (never SVG). It checks the real bytes; this is only to say so before the upload. */
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']);

export type Picked = { uri: string; fileName?: string | null; fileSize?: number | null; mimeType?: string | null };

/** Why a picture cannot be the logo, as an English key, or null when it can go. An unknown size or type is left for the server to judge. */
export function logoProblem(p: Picked): string | null {
  if (p.mimeType && !TYPES.has(p.mimeType.toLowerCase())) return 'Use a PNG, JPG, WEBP, GIF or AVIF picture.';
  if (p.fileSize != null && p.fileSize > MAX_LOGO_BYTES) return 'That picture is too big. Pick one under 2 MB.';
  return null;
}

export function describeLogoError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'LOGO_TOO_LARGE') return 'That picture is too big. Pick one under 2 MB.';
    if (e.code === 'LOGO_NOT_AN_IMAGE') return 'Use a PNG, JPG, WEBP, GIF or AVIF picture.';
  }
  return describeSettingsError(e);
}
