import { View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { useTheme } from '@/hooks/use-theme';

export default function UnreachableScreen() {
  const theme = useTheme();
  const { retry, signOut } = useSession();
  return (
    <AuthFrame title="No connection" subtitle="You are still signed in. Check your internet and try again.">
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: theme.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="WifiOff" size={24} color={theme.warning} />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Button title="Try again" onPress={() => void retry()} />
        <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </AuthFrame>
  );
}
