import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';
import { BrandIcon } from './icons/brand-icon';
import { Icon } from './icons/icon';
import type { BrandIconName } from './icons/brand-icons.generated';
import { ThemedText } from './themed-text';

/** The web dashboard's metric card (Figma 77:20923): 40px outlined brand icon, title, value, optional trend. */
export function StatCard({ title, value, icon, trend, note, tone }: { title: string; value: string; icon: BrandIconName; trend?: string; note?: string; tone?: 'danger' }) {
  const theme = useTheme();
  return (
    <Card style={{ flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: theme.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <BrandIcon name={icon} size={20} color={theme.brand} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="smallMedium" themeColor="textMuted">
          {title}
        </ThemedText>
        <ThemedText type="title" style={tone === 'danger' ? { color: theme.danger } : undefined}>{value}</ThemedText>
        {note ? (
          <ThemedText type="small" themeColor="textMuted">
            {note}
          </ThemedText>
        ) : null}
        {trend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="ArrowUpRight" size={16} color={theme.positive} />
            <ThemedText type="small" style={{ color: theme.positive, flexShrink: 1 }}>
              {trend}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
