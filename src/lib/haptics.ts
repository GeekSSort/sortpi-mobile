import { Vibration } from 'react-native';

/** Small physical feedback for the moments that matter. Plain vibration works everywhere the app runs, with no native rebuild. */
export const haptics = {
  tap: () => Vibration.vibrate(8),
  success: () => Vibration.vibrate([0, 30, 60, 30]),
  warning: () => Vibration.vibrate([0, 80, 60, 80]),
};
