import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { useTheme } from '@/hooks/use-theme';

/** The round − / + button beside an amount (44 dp, so it is easy to hit). */
export function Step({ icon, label, disabled, onPress }: { icon: 'Minus' | 'Plus'; label: string; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={4} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.inputBorder, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <Icon name={icon} size={18} color={theme.textSecondary} />
    </Tap>
  );
}
