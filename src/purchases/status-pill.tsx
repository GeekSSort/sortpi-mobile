import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { STATUS_WORDS, type PurchaseStatus } from './logic';

/** The colour that goes with an order's status: blue ordered, orange part arrived, green arrived, grey the rest. The words always sit beside it. */
export function useStatusColor(status: PurchaseStatus): { ink: string; soft: string } {
  const theme = useTheme();
  switch (status) {
    case 'CONFIRMED':
      return { ink: theme.brandText, soft: theme.brandSoft };
    case 'PARTIAL':
      return { ink: theme.warning, soft: theme.warningSoft };
    case 'RECEIVED':
      return { ink: theme.success, soft: theme.successSoft };
    default:
      return { ink: theme.textMuted, soft: theme.backgroundElement };
  }
}

export function StatusPill({ status }: { status: PurchaseStatus }) {
  const c = useStatusColor(status);
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: c.soft }}>
      <ThemedText type="smallMedium" style={{ color: c.ink }}>
        {STATUS_WORDS[status]}
      </ThemedText>
    </View>
  );
}
