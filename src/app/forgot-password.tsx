import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { api } from '@/api/session';
import { describeAuthError } from '@/auth/messages';
import { passwordChecks, requestResetCode, setNewPassword, validateNewPassword, verifyResetCode } from '@/auth/reset';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Rule } from '@/components/password-rules';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Step = 'email' | 'code' | 'password';

const COPY: Record<Step, { title: string; subtitle: string }> = {
  email: { title: 'Reset your password', subtitle: 'Type the email you sign in with. We will send you a 6-digit code.' },
  code: { title: 'Enter the code', subtitle: 'Open your email and type the 6-digit code here.' },
  password: { title: 'Choose a new password', subtitle: 'You will be signed out on your other phones.' },
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const checks = passwordChecks(password, confirm);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      await requestResetCode(api, email);
      setStep('code');
    });
  const resend = () =>
    run(async () => {
      await requestResetCode(api, email);
      setInfo('A new code is on its way.');
    });
  const verify = () =>
    run(async () => {
      setTicket(await verifyResetCode(api, email, code));
      setStep('password');
    });
  const save = () =>
    run(async () => {
      const problem = validateNewPassword(password, confirm);
      if (problem) throw new Error(problem);
      await setNewPassword(api, ticket, password);
      router.replace({ pathname: '/login', params: { reset: '1' } });
    });

  return (
    <AuthFrame title={COPY[step].title} subtitle={COPY[step].subtitle}>
      <View style={{ gap: 16 }}>
        {step === 'email' ? (
          <>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" returnKeyType="go" onSubmitEditing={sendCode} />
            <Button title="Send code" loading={busy} disabled={!email.trim()} onPress={sendCode} />
          </>
        ) : null}
        {step === 'code' ? (
          <>
            <Field label="Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={12} autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="go" onSubmitEditing={verify} hint={`Sent to ${email.trim()}`} />
            <Button title="Verify" loading={busy} disabled={code.length < 4} onPress={verify} />
            <Pressable accessibilityRole="link" onPress={resend} disabled={busy} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
              <ThemedText type="small" style={{ color: theme.brand }}>
                Send a new code
              </ThemedText>
            </Pressable>
          </>
        ) : null}
        {step === 'password' ? (
          <>
            <Field label="New password" value={password} onChangeText={setPassword} secret autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
            <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secret autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={save} />
            <View style={{ gap: 6 }}>
              <Rule ok={checks.long} text="8 or more characters" />
              <Rule ok={checks.match} text="The two passwords match" />
            </View>
            <Button title="Save password" loading={busy} disabled={!checks.long || !checks.match} onPress={save} />
          </>
        ) : null}
        {info ? <Notice kind="info">{info}</Notice> : null}
        {error ? <Notice>{error}</Notice> : null}
        <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" themeColor="textMuted">
            Back to sign in
          </ThemedText>
        </Pressable>
      </View>
    </AuthFrame>
  );
}
