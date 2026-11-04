import { View } from 'react-native';

import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { usePrefs } from '@/i18n/prefs';

/** The very first screen: each button is written in its own language, so nobody has to read English to choose. */
export default function LanguageScreen() {
  const { setLang } = usePrefs();
  return (
    <AuthFrame title="আপনার ভাষা বেছে নিন" subtitle="Choose your language">
      <View style={{ gap: 16 }}>
        <Button title="বাংলা" size="lg" onPress={() => void setLang('bn')} />
        <Button title="English" size="lg" variant="secondary" onPress={() => void setLang('en')} />
        <ThemedText type="small" themeColor="textMuted" style={{ textAlign: 'center' }}>
          পরে “আরও” থেকে বদলাতে পারবেন · You can change this later in More
        </ThemedText>
      </View>
    </AuthFrame>
  );
}
