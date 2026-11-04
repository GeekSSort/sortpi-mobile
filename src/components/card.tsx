import { View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** White surface with the 1px hairline and 8px radius used by the web StatCard and desktop panels. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: Radius.md,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: theme.border,
          padding: Spacing.four,
        },
        style,
      ]}
      {...rest}
    />
  );
}
