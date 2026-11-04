import type { Counts } from './count';

/** The count in progress, kept while the app is open so leaving the screen (a call, a phone lock, the Back button) does not lose a long count. Not kept after the app is closed. */
let kept: { branch: string; counts: Counts } | null = null;

export const keptCounts = (branch: string): Counts => (kept?.branch === branch ? kept.counts : {});
export const keepCounts = (branch: string, counts: Counts): void => {
  kept = Object.keys(counts).length ? { branch, counts } : null;
};
