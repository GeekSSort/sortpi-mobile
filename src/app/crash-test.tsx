import { Redirect } from 'expo-router';
import { crash, getCrashlytics } from '@react-native-firebase/crashlytics';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { reportError } from '@/lib/crash';

/** Developer check that Crashlytics receives reports. Only in debug builds: in a real build this goes back to Home. Open it with sortpi:///crash-test. */
export default function CrashTestScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <ThemedText type="heading" literal>
          Crashlytics check
        </ThemedText>
        <Button title="Send a test error (app keeps running)" variant="secondary" onPress={() => reportError(new Error('Crashlytics test error from SortPi'), 'crash-test')} />
        <Button title="Crash the app now" variant="primary" onPress={() => crash(getCrashlytics())} />
      </View>
    </Screen>
  );
}
