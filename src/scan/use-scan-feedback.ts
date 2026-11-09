import { useAudioPlayer } from 'expo-audio';
import { useCallback } from 'react';
import { Vibration } from 'react-native';

import { useTillDevice } from '@/sell/till-device';

export function useScanFeedback() {
  const { feedback } = useTillDevice();
  const ok = useAudioPlayer(require('@/assets/scan-ok.wav'));
  const error = useAudioPlayer(require('@/assets/scan-error.wav'));

  return useCallback((success: boolean) => {
    if (feedback === 'vibration') {
      Vibration.vibrate(success ? 40 : [0, 80, 60, 80]);
    } else if (feedback === 'sound') {
      const player = success ? ok : error;
      void player.seekTo(0).then(() => player.play()).catch(() => undefined);
    }
  }, [feedback, ok, error]);
}
