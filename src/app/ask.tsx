import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerCard } from '@/ask/answer-card';
import { answerFor, answerIntent, runPlan } from '@/ask/fetch';
import { matchIntent, type IntentId } from '@/ask/intents';
import { modelUsable, planQuestion } from '@/ask/llm';
import { logMiss } from '@/ask/miss-log';
import { SUGGESTION_WORDS, type Answer } from '@/ask/model';
import { loadModelState, useModelState } from '@/ask/model-store';
import { describePlan, toolsFor } from '@/ask/plan';
import { ownWords } from '@/ask/shop-vocab';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Icon } from '@/components/icons/icon';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';

/** What the shop says back. Each one is a message in the conversation, so earlier answers stay where they are. */
type Reply = { kind: 'thinking' } | { kind: 'answer'; answer: Answer; heard?: string } | { kind: 'pick'; options: IntentId[] } | { kind: 'error'; question: string; intent?: IntentId };
type Message = { id: number; from: 'me'; text: string } | { id: number; from: 'shop'; reply: Reply };

const STARTERS: IntentId[] = ['sales_today', 'low_stock', 'top_products', 'due_amount'];

/** Talk to your shop in Banglish, English or Bangla. Answers are built from the shop's own figures; a weak match offers the nearest questions instead of a guess. */
export default function AskScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const router = useRouter();
  const helper = useModelState();
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const next = useRef(1);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const perms = me?.permissions;
  const category = (me?.organization as { category?: { name?: string; features?: string[] } } | undefined)?.category;
  const features = category?.features;

  useEffect(() => {
    queueMicrotask(() => void loadModelState());
  }, []);

  const settle = useCallback((id: number, reply: Reply) => setMessages((all) => all.map((m) => (m.id === id && m.from === 'shop' ? { ...m, reply } : m))), []);

  const ask = useCallback(
    async (question: string, intent?: IntentId) => {
      const shown = intent ? SUGGESTION_WORDS[intent] : question.trim();
      if (!shown) return;
      const mine = next.current++;
      const theirs = next.current++;
      setText('');
      setMessages((all) => [...all, { id: mine, from: 'me', text: shown }, { id: theirs, from: 'shop', reply: { kind: 'thinking' } }]);
      try {
        if (intent) return settle(theirs, { kind: 'answer', answer: await answerIntent(intent, undefined, perms) });
        const m = matchIntent(shown);
        if (m.kind !== 'intent') {
          void logMiss(shown, m.kind);
          // The word matcher was not sure: if the helper model is on this phone, let it turn the sentence into a lookup.
          const plan = (await modelUsable()) ? await planQuestion(shown, { business: category?.name, features, words: await ownWords(), tools: toolsFor(features, perms) }) : null;
          if (plan && plan !== 'none') return settle(theirs, { kind: 'answer', answer: await runPlan(plan, perms, features), heard: describePlan(plan, t) });
          if (m.kind === 'unsure') return settle(theirs, { kind: 'pick', options: m.suggestions });
        }
        const answer = await answerFor(m, perms);
        settle(theirs, answer ? { kind: 'answer', answer } : { kind: 'pick', options: STARTERS });
      } catch {
        settle(theirs, { kind: 'error', question: shown, intent });
      }
    },
    [perms, settle, t, category, features],
  );

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Ask your shop') }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Bubble from="shop">
            <ThemedText type="body">Ask me about your shop in Banglish, English or Bangla. Sales, bills, stock, prices or who owes you.</ThemedText>
            <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
              {STARTERS.map((i) => (
                <Chip key={i} label={SUGGESTION_WORDS[i]} onPress={() => void ask('', i)} />
              ))}
            </View>
            {helper.kind !== 'ready' ? (
              <Tap accessibilityRole="button" onPress={() => router.push('/ask-model')} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="ArrowRight" size={18} color={theme.brandText} />
                <ThemedText type="smallMedium" style={{ color: theme.brandText }}>Make answers smarter</ThemedText>
              </Tap>
            ) : null}
          </Bubble>
          {messages.map((m) =>
            m.from === 'me' ? (
              <View key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '85%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.brand }}>
                <ThemedText type="body" style={{ color: '#fff' }} literal>{m.text}</ThemedText>
              </View>
            ) : (
              <ShopReply key={m.id} reply={m.reply} onPick={(i) => void ask('', i)} onRetry={(r) => void ask(r.question, r.intent)} onAsk={(i) => void ask('', i)} />
            ),
          )}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void ask(text)}
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('Ajker bill koto?')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t('Ask your shop')}
            style={{ flex: 1, minHeight: 52, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.canvas, color: theme.text, fontSize: 17 }}
          />
          <Tap accessibilityRole="button" accessibilityLabel={t('Ask')} onPress={() => void ask(text)} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Send" size={22} color="#fff" />
          </Tap>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ShopReply({ reply, onPick, onRetry, onAsk }: { reply: Reply; onPick: (i: IntentId) => void; onRetry: (r: { question: string; intent?: IntentId }) => void; onAsk: (i: IntentId) => void }) {
  const { t } = usePrefs();
  if (reply.kind === 'thinking')
    return (
      <Bubble from="shop">
        <SkeletonRows count={2} />
      </Bubble>
    );
  if (reply.kind === 'error')
    return (
      <Bubble from="shop">
        <ThemedText type="body">Could not get the answer. Check the internet and try again.</ThemedText>
        <Button title="Try again" onPress={() => onRetry(reply)} />
      </Bubble>
    );
  if (reply.kind === 'pick')
    return (
      <Bubble from="shop">
        <ThemedText type="body">Did you mean one of these?</ThemedText>
        <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
          {reply.options.map((i) => (
            <Chip key={i} label={SUGGESTION_WORDS[i]} onPress={() => onPick(i)} />
          ))}
        </View>
      </Bubble>
    );
  return (
    <View style={{ gap: Spacing.one }}>
      {reply.heard ? <ThemedText type="small" themeColor="textMuted" literal>{`${t('I understood this as')}: ${reply.heard}`}</ThemedText> : null}
      <AnswerCard a={reply.answer} onAsk={onAsk} />
    </View>
  );
}

/** A message from the shop: a card on the left, so it reads as the other side of the conversation. */
function Bubble({ children }: { from: 'shop'; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '92%', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>{children}</View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: Radius.full, backgroundColor: theme.brandSoft, borderWidth: 1.5, borderColor: theme.brandSoftBorder }}>
      <ThemedText type="smallMedium" style={{ color: theme.brandText }} literal>{label}</ThemedText>
    </Tap>
  );
}
