import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** Inline message box: error (red) or info (blue), as the desktop's onboarding feedback boxes. */
export function Notice({ kind = 'error', children }: { kind?: 'error' | 'info'; children: React.ReactNode }) {
  const theme = useTheme();
  const error = kind === 'error';
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 12,
        borderRadius: Radius.md,
        borderWidth: 1,
        backgroundColor: error ? theme.dangerSoft : theme.brandSoft,
        borderColor: error ? theme.dangerBorder : theme.brandSoftBorder,
      }}>
      <ThemedText type="small" style={{ color: error ? theme.danger : theme.brandText }}>
        {children}
      </ThemedText>
    </View>
  );
}
