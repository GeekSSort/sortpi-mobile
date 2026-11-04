import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { workspaceDisplayName } from '@/auth/workspace';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

/** What the app does for the shop, in three plain lines. */
const OUTCOMES: { icon: IconName; text: string }[] = [
  { icon: 'ScanLine', text: 'Sell by scanning a barcode' },
  { icon: 'Package', text: 'Know what is in stock' },
  { icon: 'BarChart', text: 'See what you earned today' },
];

/** First thing a person sees after opening a shared link: which shop this is, then one button to sign in. */
export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { workspaceUrl } = useSession();
  const name = workspaceDisplayName(workspaceUrl);

  return (
    <AuthFrame title={name ? t('Welcome to {name}', { name }) : 'Welcome'} subtitle="Sign in with the email and password the shop owner gave you.">
      <View style={{ gap: 12 }}>
        <View style={{ gap: 10, paddingBottom: 4 }}>
          {OUTCOMES.map((o) => (
            <View key={o.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
                <Icon name={o.icon} size={18} color={theme.brandText} />
              </View>
              <ThemedText type="body" style={{ flex: 1 }}>
                {o.text}
              </ThemedText>
            </View>
          ))}
        </View>
        <Button title="Sign in" trailing={<Icon name="ArrowRight" size={18} color={theme.onBrand} />} onPress={() => router.replace('/login')} />
        <Pressable accessibilityRole="link" onPress={() => router.replace('/workspace')} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" themeColor="textMuted">
            Not your shop? Change workspace
          </ThemedText>
        </Pressable>
      </View>
    </AuthFrame>
  );
}
