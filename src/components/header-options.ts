import { UbuntuFonts } from '@/constants/theme';
import { usePrefs } from '@/i18n/prefs';
import { useTheme } from '@/hooks/use-theme';

/** The native stack header, dressed in the app's palette: the system's own back arrow, title and status-bar handling. */
export function useHeaderOptions() {
  const theme = useTheme();
  const { lang } = usePrefs();
  return {
    headerShown: true,
    headerStyle: { backgroundColor: theme.card },
    headerTintColor: theme.text,
    headerTitleStyle: lang === 'bn' ? { fontWeight: '500' as const, fontSize: 18, color: theme.text } : { fontFamily: UbuntuFonts.medium, fontSize: 18, color: theme.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.canvas },
  } as const;
}
