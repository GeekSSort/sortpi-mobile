import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { Vibration } from 'react-native';

import { useTillDevice } from '@/sell/till-device';

/** What a scan came to: a product found (`true`), nothing found (`false`), or a product that is already in the cart (`'again'`). */
export type ScanResult = boolean | 'again';

export function useScanFeedback() {
  const { feedback } = useTillDevice();
  const ok = useAudioPlayer(require('@/assets/scan-ok.wav'));
  const error = useAudioPlayer(require('@/assets/scan-error.wav'));
  const again = useAudioPlayer(require('@/assets/scan-again.wav'));

  return useCallback((result: ScanResult) => {
    if (feedback === 'vibration') {
      Vibration.vibrate(result === 'again' ? [0, 40, 70, 40, 70, 40] : result ? 40 : [0, 80, 60, 80]);
    } else if (feedback === 'sound') {
      const player = result === 'again' ? again : result ? ok : error;
      void player.seekTo(0).then(() => player.play()).catch(() => undefined);
    }
  }, [feedback, ok, error, again]);
}
