import { View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';

/** When something could not load: what happened in plain words and a button that tries again, never just "pull down". */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="alert" style={{ alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: theme.dangerBorder }}>
      <Icon name="TriangleAlert" size={28} color={theme.danger} />
      <ThemedText type="body" style={{ textAlign: 'center' }}>
        {message}
      </ThemedText>
      <Button title="Try again" onPress={onRetry} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}
