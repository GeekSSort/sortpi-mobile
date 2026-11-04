import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePrefs } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';

import { guideStep } from './guide';

const TIPS: Record<1 | 2 | 3, string> = {
  1: 'Tap an item to add it, or scan its barcode.',
  2: 'Check the items in your cart, then tap “Take payment”.',
  3: 'Choose how the customer pays, then tap the green button.',
};

/** A short tip card that walks a new person through their first sale. It goes away for good once the first sale is done or skipped. */
export function SaleGuide({ mode, cartEmpty, usesBarcodes = true }: { mode: 'scan' | 'pay' | 'done'; cartEmpty: boolean; usesBarcodes?: boolean }) {
  const theme = useTheme();
  const { t, guideDone, setGuideDone } = usePrefs();
  if (guideDone) return null;
  const step = guideStep({ mode, cartEmpty });
  return (
    <View accessibilityRole="summary" style={{ gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: theme.brandSoftBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
        <Icon name={step === 'done' ? 'Check' : 'ScanLine'} size={20} color={theme.brandText} />
        <ThemedText type="smallMedium" style={{ color: theme.brandText, flex: 1 }}>
          {step === 'done' ? t('Well done! That is how you make a sale.') : t('Step {n} of 3', { n: step })}
        </ThemedText>
        <Pressable accessibilityRole="button" onPress={() => void setGuideDone(true)} style={{ minHeight: 48, paddingHorizontal: 4, justifyContent: 'center', marginVertical: -12 }}>
          <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
            {step === 'done' ? 'Got it' : 'Skip help'}
          </ThemedText>
        </Pressable>
      </View>
      {step === 'done' ? null : <ThemedText type="body">{step === 1 && !usesBarcodes ? t('Tap an item to add it. Use the search box to find one by name.') : t(TIPS[step])}</ThemedText>}
    </View>
  );
}
