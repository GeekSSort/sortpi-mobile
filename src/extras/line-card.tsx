import { View } from 'react-native';

import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

/** One item on a list being written: its name, how many, optionally the cost of one, and a way to take it off. */
export function LineCard({ name, sku, quantity, onQuantity, unitCost, onUnitCost, allowDecimal, quantityLabel = 'How many', onRemove }: { name: string; sku: string; quantity: string; onQuantity: (v: string) => void; unitCost?: string; onUnitCost?: (v: string) => void; allowDecimal: boolean; quantityLabel?: string; onRemove: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallMedium" numberOfLines={2} literal>
            {name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {sku}
          </ThemedText>
        </View>
        <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name })} onPress={onRemove} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Trash2" size={20} color={theme.danger} />
        </Tap>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <Field label={quantityLabel} value={quantity} onChangeText={onQuantity} keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'} error={quantity && !(Number(quantity) > 0) ? t('Enter an amount above zero.') : undefined} />
        </View>
        {onUnitCost ? (
          <View style={{ flex: 1 }}>
            <Field label="Cost of one" prefix="৳" value={unitCost ?? ''} onChangeText={onUnitCost} keyboardType="decimal-pad" placeholder="0" />
          </View>
        ) : null}
      </View>
    </View>
  );
}
