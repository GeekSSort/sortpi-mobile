import { randomUUID } from 'expo-crypto';

/**
 * One key per user action, created when the person taps (not on every attempt) and reused on every
 * retry of that same action. Same key + same body replays the first result instead of posting twice.
 */
export const newIdempotencyKey = (): string => randomUUID();
