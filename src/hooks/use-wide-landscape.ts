import { Platform, useWindowDimensions } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';
import { isWideAndroidLandscape } from '@/ui/landscape';

export function useWideLandscape() {
  const { width, height } = useWindowDimensions();
  const wideLandscape = isWideAndroidLandscape(Platform.OS, width, height);
  return { wideLandscape, contentWidth: wideLandscape ? 1280 : MaxContentWidth };
}
