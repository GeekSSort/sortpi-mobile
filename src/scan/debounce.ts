/**
 * A camera reports the same code many times a second while it is in view. One scan should add one
 * item, however long the code is held there.
 *
 * `at` is the last time the camera SAW this code, updated on every read, not only on accepted ones.
 * So a held code never repeats: it counts again only after the camera has not seen it for `gapMs`
 * (the cashier moved it away, or scanned something else), which is how a counter scanner behaves.
 */
export type LastRead = { code: string; at: number };

export function nextRead(last: LastRead, code: string, now: number, gapMs = 1200): { accept: boolean; last: LastRead } {
  if (!code) return { accept: false, last };
  const accept = code !== last.code || now - last.at >= gapMs;
  return { accept, last: { code, at: now } };
}
