import { useLocalSearchParams, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AnswerCard } from '@/ask/answer-card';
import { answerFor, answerIntent } from '@/ask/fetch';
import { matchIntent, type IntentId } from '@/ask/intents';
import { logMiss } from '@/ask/miss-log';
import { SUGGESTION_WORDS, type Answer } from '@/ask/model';
import { useSession } from '@/auth/session-provider';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

type View_ = { state: 'idle' } | { state: 'loading' } | { state: 'error' } | { state: 'answer'; answer: Answer } | { state: 'pick'; options: IntentId[] };

/** Ask the shop a question in Banglish, English or Bangla. The answer is built from the shop's own figures; a weak match offers the nearest questions instead of a guess. */
export default function AskScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [view, setView] = useState<View_>({ state: 'idle' });
  const perms = me?.permissions;

  const run = useCallback(
    async (question: string, intent?: IntentId) => {
      if (!question.trim() && !intent) return;
      setView({ state: 'loading' });
      try {
        if (intent) return setView({ state: 'answer', answer: await answerIntent(intent, undefined, perms) });
        const m = matchIntent(question);
        if (m.kind === 'unsure') {
          void logMiss(question, 'unsure');
          return setView({ state: 'pick', options: m.suggestions });
        }
        if (m.kind === 'unsupported') void logMiss(question, 'unsupported');
        const answer = await answerFor(m, perms);
        setView(answer ? { state: 'answer', answer } : { state: 'idle' });
      } catch {
        setView({ state: 'error' });
      }
    },
    [perms],
  );

  // A question sent from Home (or a chip) arrives as ?q=… and is answered once on opening.
  const first = params.q;
  useEffect(() => {
    if (first) queueMicrotask(() => void run(first));
  }, [first, run]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Ask your shop') }} />
      <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void run(text)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('Ajker bill koto?')}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel={t('Ask your shop')}
          style={{ flex: 1, minHeight: 52, paddingHorizontal: 16, borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.card, color: theme.text, fontSize: 17 }}
        />
        <Tap accessibilityRole="button" accessibilityLabel={t('Ask')} onPress={() => void run(text)} style={{ width: 52, height: 52, borderRadius: Radius.lg, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Search" size={22} color="#fff" />
        </Tap>
      </View>

      {view.state === 'idle' ? (
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="small" themeColor="textMuted">Try one of these</ThemedText>
          {(['sales_today', 'low_stock', 'top_products', 'due_amount'] as const).map((i) => (
            <Chip key={i} label={SUGGESTION_WORDS[i]} onPress={() => { setText(SUGGESTION_WORDS[i]); void run('', i); }} />
          ))}
        </View>
      ) : null}
      {view.state === 'loading' ? <SkeletonRows count={4} /> : null}
      {view.state === 'error' ? <ErrorState message={t('Could not get the answer. Check the internet and try again.')} onRetry={() => void run(text)} /> : null}
      {view.state === 'pick' ? (
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="body">Did you mean one of these?</ThemedText>
          {view.options.map((i) => (
            <Chip key={i} label={SUGGESTION_WORDS[i]} onPress={() => { setText(SUGGESTION_WORDS[i]); void run('', i); }} />
          ))}
        </View>
      ) : null}
      {view.state === 'answer' ? <AnswerCard a={view.answer} onAsk={(i) => void run('', i)} /> : null}
    </ScrollView>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: theme.brandSoft, borderWidth: 1.5, borderColor: theme.brandSoftBorder, alignSelf: 'flex-start' }}>
      <ThemedText type="smallMedium" style={{ color: theme.brandText }} literal>{label}</ThemedText>
    </Tap>
  );
}
