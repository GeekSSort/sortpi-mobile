import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { describeAuthError } from '@/auth/messages';
import { useSession } from '@/auth/session-provider';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { useTheme } from '@/hooks/use-theme';

/**
 * The page behind a shared link: `sortpi://join?workspace=acme-traders`.
 * Saves the workspace, then shows the Welcome screen, then Sign in.
 */
export default function JoinScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { workspace } = useLocalSearchParams<{ workspace?: string }>();
  const { chooseWorkspace } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) {
      // Signing out lands here too (it is the first signed-out route), so hand off instead of blaming a link.
      router.replace('/login');
      return;
    }
    let cancelled = false;
    chooseWorkspace(workspace)
      .then(() => !cancelled && router.replace('/welcome'))
      .catch((e) => !cancelled && setError(describeAuthError(e)));
    return () => {
      cancelled = true;
    };
  }, [workspace, chooseWorkspace, router]);

  return (
    <AuthFrame title={error ? 'Link problem' : 'Opening your shop'}>
      {error ? (
        <View style={{ gap: 16 }}>
          <Notice>{error}</Notice>
          <Button title="Type your shop name" onPress={() => router.replace('/workspace')} />
        </View>
      ) : (
        <ActivityIndicator color={theme.brand} />
      )}
    </AuthFrame>
  );
}
