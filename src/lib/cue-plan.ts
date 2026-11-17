/** How the phone answers the cashier: by sound, by vibration, or not at all. One choice in the menu covers the whole app. */
export type Feedback = 'sound' | 'vibration' | 'silent';

/** The moments the app answers: a tap, an item added, a barcode read, the same product scanned again, a code with no product, a thing that worked, a thing that failed. */
export type Cue = 'tap' | 'added' | 'found' | 'again' | 'missing' | 'success' | 'warning';

export type SoundName = 'ok' | 'again' | 'error' | 'done';

export type CuePlan = { sound: SoundName | null; vibrate: number | number[] | null };

const SOUND: Record<Cue, SoundName | null> = { tap: null, added: 'ok', found: 'ok', again: 'again', missing: 'error', success: 'done', warning: 'error' };
const VIBRATE: Record<Cue, number | number[]> = {
  tap: 8,
  added: 40,
  found: 40,
  again: [0, 40, 70, 40, 70, 40],
  missing: [0, 80, 60, 80],
  success: [0, 30, 60, 30],
  warning: [0, 80, 60, 80],
};

/**
 * What to do for a cue under the chosen setting. Silent does nothing at all. Vibration vibrates. Sound plays the sound; a plain tap has no
 * sound (it would be noise on every button), so it keeps its tiny vibration.
 */
export function cuePlan(feedback: Feedback, cue: Cue): CuePlan {
  if (feedback === 'silent') return { sound: null, vibrate: null };
  if (feedback === 'vibration') return { sound: null, vibrate: VIBRATE[cue] };
  const sound = SOUND[cue];
  return sound ? { sound, vibrate: null } : { sound: null, vibrate: VIBRATE[cue] };
}
