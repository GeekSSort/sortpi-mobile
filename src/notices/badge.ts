/** The number on the bell: nothing when everything is read, the count up to 9, and "9+" beyond (a badge must stay small). */
export function badgeText(unread: number | null | undefined): string | null {
  if (!unread || !Number.isFinite(unread) || unread < 1) return null;
  return unread > 9 ? '9+' : String(Math.floor(unread));
}
