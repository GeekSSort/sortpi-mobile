import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useWideLandscape } from '@/hooks/use-wide-landscape';

export function FormColumns({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  const { wideLandscape, contentWidth } = useWideLandscape();
  return (
    <View style={{ alignSelf: 'center', width: '100%', maxWidth: contentWidth, flexDirection: wideLandscape ? 'row' : 'column', alignItems: wideLandscape ? 'flex-start' : 'stretch', gap: Spacing.three }}>
      <View style={{ flex: wideLandscape ? 3 : undefined, minWidth: 0, gap: Spacing.three }}>{primary}</View>
      <View style={{ flex: wideLandscape ? 2 : undefined, minWidth: 0, gap: Spacing.three }}>{secondary}</View>
    </View>
  );
}
