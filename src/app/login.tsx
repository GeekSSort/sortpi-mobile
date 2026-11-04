import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { describeAuthError } from '@/auth/messages';
import { useSession } from '@/auth/session-provider';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ThemedText } from '@/components/themed-text';
import { Notice } from '@/components/notice';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

function hostOf(url: string | null): string {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const theme = useTheme();
  const { t } = usePrefs();
  const { signIn, workspaceUrl, biometricAvailable, biometricEnabled, setBiometricEnabled } = useSession();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceUrl) router.replace('/workspace');
  }, [workspaceUrl, router]);

  async function submit() {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      if (biometricAvailable && !biometricEnabled) {
        Alert.alert(t(process.env.EXPO_OS === 'ios' ? 'Unlock with Face ID?' : 'Unlock with your fingerprint?'), t('Open SortPi with your phone instead of typing your password again.'), [
          { text: t('Not now'), style: 'cancel' },
          { text: t('Turn on'), onPress: () => void setBiometricEnabled(true) },
        ]);
      }
    } catch (e) {
      setError(describeAuthError(e));
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Sign in" subtitle={workspaceUrl ? hostOf(workspaceUrl) : undefined}>
      <View style={{ gap: 16 }}>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Field
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secret
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {reset ? <Notice kind="info">Password changed. Sign in with the new one.</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        <Button title="Sign in" loading={busy} disabled={!email.trim() || !password} onPress={submit} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/forgot-password')} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" style={{ color: theme.brand }}>
            Forgot password?
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.replace('/workspace')} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" style={{ color: theme.brand }}>
            Change workspace
          </ThemedText>
        </Pressable>
      </View>
    </AuthFrame>
  );
}
