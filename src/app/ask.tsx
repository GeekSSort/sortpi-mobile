import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AnswerCard } from '@/ask/answer-card';
import { answerFor, answerIntent } from '@/ask/fetch';
import { matchIntent, productNameIn, type IntentId } from '@/ask/intents';
import { modelUsable, pickIntent } from '@/ask/llm';
import { logMiss } from '@/ask/miss-log';
import { SUGGESTION_WORDS, type Answer } from '@/ask/model';
import { loadModelState, useModelState } from '@/ask/model-store';
import { useSession } from '@/auth/session-provider';
import { ErrorState } from '@/components/error-state';
import { Icon } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

type View_ = { state: 'idle' } | { state: 'loading' } | { state: 'error' } | { state: 'answer'; answer: Answer; heard?: IntentId } | { state: 'pick'; options: IntentId[] };

/** Ask the shop a question in Banglish, English or Bangla. The answer is built from the shop's own figures; a weak match offers the nearest questions instead of a guess. */
export default function AskScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [view, setView] = useState<View_>({ state: 'idle' });
  const perms = me?.permissions;
  const router = useRouter();
  const helper = useModelState();

  const run = useCallback(
    async (question: string, intent?: IntentId) => {
      if (!question.trim() && !intent) return;
      setView({ state: 'loading' });
      try {
        if (intent) return setView({ state: 'answer', answer: await answerIntent(intent, undefined, perms) });
        const m = matchIntent(question);
        if (m.kind !== 'intent') {
          void logMiss(question, m.kind);
          // The word matcher was not sure: if the helper model is on this phone, let it pick which question this means.
          const pick = (await modelUsable()) ? await pickIntent(question) : null;
          const name = productNameIn(question);
          const needsName = pick === 'product_price' || pick === 'product_stock';
          if (pick && pick !== 'none' && !(needsName && !name)) return setView({ state: 'answer', answer: await answerIntent(pick, name || undefined, perms), heard: pick });
          if (m.kind === 'unsure') return setView({ state: 'pick', options: m.suggestions });
        }
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
    queueMicrotask(() => void loadModelState());
  }, []);
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
      {view.state === 'answer' && view.heard ? (
        <ThemedText type="small" themeColor="textMuted" literal>{`${t('I understood this as')}: ${SUGGESTION_WORDS[view.heard]}`}</ThemedText>
      ) : null}
      {view.state === 'answer' ? <AnswerCard a={view.answer} onAsk={(i) => void run('', i)} /> : null}
      {helper.kind !== 'ready' ? (
        <Tap accessibilityRole="button" onPress={() => router.push('/ask-model')} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="ArrowRight" size={18} color={theme.brandText} />
          <ThemedText type="smallMedium" style={{ color: theme.brandText }}>Make answers smarter</ThemedText>
        </Tap>
      ) : null}
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
