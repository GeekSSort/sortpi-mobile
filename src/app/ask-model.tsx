import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { megabytes, percent, spaceNeeded, type Gate } from '@/ask/model-state';
import { MODEL } from '@/ask/model-spec';
import { checkGate, loadModelState, pauseDownload, removeModel, startDownload, useModelState } from '@/ask/model-store';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

const SIZE = megabytes(MODEL.bytes);

/** Download or remove the small language helper that lets Ask understand more ways of asking. Works with no internet once it is on the phone. */
export default function AskModelScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const s = useModelState();
  const [gate, setGate] = useState<Gate>('ok');

  useEffect(() => {
    queueMicrotask(() => void loadModelState());
  }, []);

  async function begin() {
    const g = await checkGate();
    setGate(g);
    if (g === 'low_memory' || g === 'no_space') return;
    if (g === 'mobile_data') {
      Alert.alert(t('You are on mobile data'), t('This uses about {n} MB of your data. Download anyway?', { n: SIZE }), [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Download'), onPress: () => void startDownload() },
      ]);
      return;
    }
    void startDownload();
  }

  function confirmRemove() {
    Alert.alert(t('Delete the helper?'), t('This frees {n} MB. Ask still works with the word matcher.', { n: SIZE }), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => void removeModel() },
    ]);
  }

  const received = s.kind === 'downloading' || s.kind === 'paused' || s.kind === 'failed' ? s.received : 0;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Smarter answers') }} />
      <ThemedText type="body">A small helper on your phone can understand more ways of asking. It is about 1.1 GB, downloaded once, and then works with no internet.</ThemedText>
      <ThemedText type="small" themeColor="textMuted">It only understands your question. The numbers always come from your shop.</ThemedText>

      {gate === 'low_memory' ? <Notice>This phone does not have enough memory for the helper. Ask still works without it.</Notice> : null}
      {gate === 'no_space' ? <Notice>{t('Not enough space. Free up about {n} MB and try again.', { n: megabytes(spaceNeeded(received)) })}</Notice> : null}
      {s.kind === 'failed' ? <Notice>{s.why === 'damaged' ? 'The file was not complete, so it was removed. Download it again.' : 'The download stopped. Check the internet and continue.'}</Notice> : null}

      {s.kind === 'downloading' || s.kind === 'paused' ? (
        <View style={{ gap: Spacing.two }}>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent(received) }} style={{ height: 14, borderRadius: Radius.full, backgroundColor: theme.border, overflow: 'hidden' }}>
            <View style={{ width: `${percent(received)}%`, height: '100%', backgroundColor: theme.brand }} />
          </View>
          <ThemedText type="smallMedium" literal>{`${percent(received)}% · ${megabytes(received)} / ${SIZE} MB`}</ThemedText>
          {s.kind === 'downloading' ? <ThemedText type="small" themeColor="textMuted">Keep the app open while it downloads.</ThemedText> : null}
        </View>
      ) : null}

      {s.kind === 'ready' ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
          <Icon name="CheckCircle" size={22} color={theme.success} />
          <ThemedText type="bodyMedium" style={{ color: theme.success }}>Ready. Works with no internet.</ThemedText>
        </View>
      ) : null}

      {s.kind === 'absent' || s.kind === 'failed' ? <Button title={s.kind === 'failed' && s.received > 0 ? 'Continue download' : t('Download ({n} MB)', { n: SIZE })} onPress={() => void begin()} /> : null}
      {s.kind === 'paused' ? <Button title="Continue download" onPress={() => void begin()} /> : null}
      {s.kind === 'downloading' ? <Button title="Pause" variant="secondary" onPress={() => void pauseDownload()} /> : null}
      {s.kind === 'ready' || s.kind === 'paused' || (s.kind === 'failed' && s.received > 0) ? <Button title="Delete the helper" variant="secondary" onPress={confirmRemove} /> : null}
    </ScrollView>
  );
}
