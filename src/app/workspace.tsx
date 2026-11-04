import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { describeAuthError } from '@/auth/messages';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export default function WorkspaceScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { shop } = useLocalSearchParams<{ shop?: string }>();
  const { chooseWorkspace } = useSession();
  const [name, setName] = useState(shop ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await chooseWorkspace(name);
      router.replace('/login');
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Find your shop" subtitle="Type your shop's SortPi name. Not sure? Ask the shop owner.">
      <View style={{ gap: 16 }}>
        <Field
          label="Shop name"
          value={name}
          onChangeText={setName}
          placeholder="your-shop"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={submit}
          hint="It is the first part of your shop's SortPi web address, before .sortpi.com."
        />
        {error ? <Notice>{error}</Notice> : null}
        <Button title="Continue" size="md" loading={busy} disabled={!name.trim()} onPress={submit} />
        <Pressable accessibilityRole="link" accessibilityState={{ expanded: help }} onPress={() => setHelp((h) => !h)} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" style={{ color: theme.brand }}>
            Forgot the shop name?
          </ThemedText>
        </Pressable>
        {help ? (
          <Notice kind="info">
            {'It is the first part of the web address your shop uses, before .sortpi.com.\n\n1. Look at the web address you or the owner use on the computer.\n2. Open the email invitation you were sent: the link starts with the shop name.\n3. Ask the shop owner. Owners can send it from Shop details in this app.'}
          </Notice>
        ) : null}
        <Pressable accessibilityRole="link" onPress={() => router.push('/signup')} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed ? 0.5 : 1 })}>
          <ThemedText type="small" style={{ color: theme.brand }}>
            No shop yet? Open a free account
          </ThemedText>
        </Pressable>
      </View>
    </AuthFrame>
  );
}
