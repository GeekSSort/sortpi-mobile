import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Vibration } from 'react-native';

import { getFeedback } from '@/sell/till-device';

import { cuePlan, type Cue, type SoundName } from './cue-plan';

const SOURCES: Record<SoundName, number> = {
  ok: require('@/assets/scan-ok.wav'),
  again: require('@/assets/scan-again.wav'),
  error: require('@/assets/scan-error.wav'),
  done: require('@/assets/payment-done.wav'),
};

// One player per sound, made the first time it is needed and then reused (a new player for every beep would be slow and leak).
const players: Partial<Record<SoundName, AudioPlayer>> = {};

function play(name: SoundName) {
  try {
    const player = (players[name] ??= createAudioPlayer(SOURCES[name]));
    void player.seekTo(0).then(() => player.play()).catch(() => undefined);
  } catch {
    // no sound is better than a crash at the till
  }
}

/** Answer the cashier the way the menu says (Sound, Vibration or Silent). Safe to call from anywhere, any time. */
export function cue(kind: Cue) {
  const plan = cuePlan(getFeedback(), kind);
  if (plan.vibrate !== null) Vibration.vibrate(plan.vibrate);
  if (plan.sound !== null) play(plan.sound);
}
