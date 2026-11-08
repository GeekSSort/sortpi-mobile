import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

import { showAskButton } from './fab-rules';

/** The chat button that floats over the main screens, above the tab bar, and opens the conversation with the shop. */
export function AskFab() {
  const path = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { t } = usePrefs();
  const insets = useSafeAreaInsets();
  if (!showAskButton(path)) return null;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={t('Ask your shop')}
      onPress={() => router.push('/ask')}
      style={{ position: 'absolute', right: 16, bottom: insets.bottom + 92, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center', boxShadow: Shadows.brand }}>
      <Icon name="Chat" size={26} color="#fff" />
    </Tap>
  );
}
