import { View } from 'react-native';

import { Field } from '@/components/field';
import { ThemedText } from '@/components/themed-text';
import { usePrefs } from '@/i18n/prefs';

import { parseSerials, type Needed } from './serials';

/**
 * One box per serial-numbered item on the sale: an IMEI per phone, typed or pasted, one per line or separated by commas. A scanner that
 * types a number and presses Enter fills a line. The count of numbers is shown against how many units are being sold.
 */
export function SerialEntry({ needed, typed, onChange }: { needed: Needed[]; typed: Record<string, string>; onChange: (variantId: string, text: string) => void }) {
  const { t } = usePrefs();
  if (needed.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        Serial numbers: one for each unit
      </ThemedText>
      {needed.map((n) => {
        const have = parseSerials(typed[n.variantId] ?? '').length;
        return (
          <Field
            key={n.variantId}
            label={n.name}
            value={typed[n.variantId] ?? ''}
            onChangeText={(v) => onChange(n.variantId, v)}
            multiline
            numberOfLines={Math.min(5, Math.max(2, n.count))}
            autoCapitalize="characters"
            autoCorrect={false}
            hint={t('{have} of {n} serial numbers', { have, n: n.count })}
            placeholder="One number per line"
            required
          />
        );
      })}
    </View>
  );
}
