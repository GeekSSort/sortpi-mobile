import { cue } from './cues';

/** Small feedback for the moments that matter. It follows the menu's Sound / Vibration / Silent choice (see cues.ts). */
export const haptics = {
  tap: () => cue('tap'),
  success: () => cue('success'),
  warning: () => cue('warning'),
};
