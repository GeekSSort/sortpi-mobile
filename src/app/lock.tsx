import { useEffect } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { useTheme } from '@/hooks/use-theme';

export default function LockScreen() {
  const theme = useTheme();
  const { unlock, signOut, unlocking } = useSession();

  useEffect(() => {
    void unlock(); // ask straight away; the button is there if it is cancelled
  }, [unlock]);

  return (
    <AuthFrame title="SortPi is locked" subtitle={process.env.EXPO_OS === 'ios' ? 'Use Face ID to continue.' : 'Use your fingerprint to continue.'}>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Lock" size={24} color={theme.brand} />
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <Button title={unlocking ? 'Opening your shop…' : 'Unlock'} loading={unlocking} trailing={<Icon name="ScanFace" size={18} color={theme.onBrand} />} onPress={() => void unlock()} />
        <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </AuthFrame>
  );
}
