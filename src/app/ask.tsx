import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnswerCard } from '@/ask/answer-card';
import { answerFor, answerIntent, runPlan } from '@/ask/fetch';
import { matchIntent, type IntentId } from '@/ask/intents';
import { modelNotNeededSoon, modelUsable, planQuestion, warmUpModel } from '@/ask/llm';
import { keepQuestion, markQuestion } from '@/ask/log-app';
import type { Verdict } from '@/ask/question-log';
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
type Reply = { kind: 'thinking' } | { kind: 'answer'; answer: Answer; heard?: string; logId?: number | null; verdict?: Verdict } | { kind: 'pick'; options: IntentId[]; logId?: number | null } | { kind: 'error'; question: string; intent?: IntentId };
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
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const perms = me?.permissions;
  const category = (me?.organization as { category?: { code?: string; name?: string; features?: string[] } } | undefined)?.category;
  const features = category?.features;

  useEffect(() => {
    queueMicrotask(() => void loadModelState());
  }, []);

  // Get the model ready while the person is still reading the screen, and let it go soon after they leave.
  useEffect(() => {
    let here = true;
    void (async () => {
      if (!(await modelUsable())) return;
      const words = await ownWords();
      if (here) await warmUpModel({ business: category?.name, features, words, tools: toolsFor(features, perms) });
    })();
    return () => {
      here = false;
      modelNotNeededSoon();
    };
  }, [category?.name, features, perms]);

  const settle = useCallback((id: number, reply: Reply) => setMessages((all) => all.map((m) => (m.id === id && m.from === 'shop' ? { ...m, reply } : m))), []);

  const ask = useCallback(
    async (question: string, intent?: IntentId) => {
      const shown = intent ? SUGGESTION_WORDS[intent] : question.trim();
      if (!shown) return;
      const mine = next.current++;
      const theirs = next.current++;
      setText('');
      input.current?.focus(); // keep the keyboard up so the next question can be typed straight away
      setMessages((all) => [...all, { id: mine, from: 'me', text: shown }, { id: theirs, from: 'shop', reply: { kind: 'thinking' } }]);
      const business = category?.code ?? null;
      try {
        if (intent) return settle(theirs, { kind: 'answer', answer: await answerIntent(intent, undefined, perms) }); // a tapped suggestion is not a typed question
        const m = matchIntent(shown);
        let how: { path: 'matcher' | 'model' | 'none'; result: string; plan?: string } = m.kind === 'intent' ? { path: 'matcher', result: m.intent } : { path: 'none', result: m.kind };
        if (m.kind !== 'intent') {
          // The word matcher was not sure: if the helper model is on this phone, let it turn the sentence into a lookup.
          const plan = (await modelUsable()) ? await planQuestion(shown, { business: category?.name, features, words: await ownWords(), tools: toolsFor(features, perms) }) : null;
          if (plan) how = { path: 'model', result: plan === 'none' ? 'none' : plan.tool, plan: plan === 'none' ? undefined : JSON.stringify(plan) };
          if (plan && plan !== 'none') {
            const logId = await keepQuestion({ text: shown, ...how, business });
            return settle(theirs, { kind: 'answer', answer: await runPlan(plan, perms, features), heard: describePlan(plan, t), logId });
          }
          if (m.kind === 'unsure') return settle(theirs, { kind: 'pick', options: m.suggestions, logId: await keepQuestion({ text: shown, ...how, business }) });
        }
        const logId = await keepQuestion({ text: shown, ...how, business });
        const answer = await answerFor(m, perms);
        settle(theirs, answer ? { kind: 'answer', answer, logId } : { kind: 'pick', options: STARTERS, logId });
      } catch {
        settle(theirs, { kind: 'error', question: shown, intent });
      }
    },
    [perms, settle, t, category, features],
  );

  /** The person says whether an answer was what they asked. A "no" keeps the question for later and offers the common ones to choose from. */
  const rate = useCallback((id: number, verdict: Verdict) => {
    setMessages((all) =>
      all.map((m) => {
        if (m.id !== id || m.from !== 'shop' || m.reply.kind !== 'answer') return m;
        void markQuestion(m.reply.logId, verdict);
        return { ...m, reply: { ...m.reply, verdict } };
      }),
    );
  }, []);

  /** Picking what they meant is the best label there is: it is kept with the question. */
  const meant = useCallback(
    (id: number, intent: IntentId) => {
      const m = messages.find((x) => x.id === id);
      if (m?.from === 'shop' && (m.reply.kind === 'pick' || m.reply.kind === 'answer')) void markQuestion(m.reply.logId, 'wrong', SUGGESTION_WORDS[intent]);
      void ask('', intent);
    },
    [messages, ask],
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
              <ShopReply key={m.id} reply={m.reply} onPick={(i) => meant(m.id, i)} onRetry={(r) => void ask(r.question, r.intent)} onAsk={(i) => void ask('', i)} onRate={(v) => rate(m.id, v)} />
            ),
          )}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card }}>
          <TextInput
            ref={input}
            autoFocus
            submitBehavior="submit"
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

function ShopReply({ reply, onPick, onRetry, onAsk, onRate }: { reply: Reply; onPick: (i: IntentId) => void; onRetry: (r: { question: string; intent?: IntentId }) => void; onAsk: (i: IntentId) => void; onRate: (v: Verdict) => void }) {
  const { t } = usePrefs();
  if (reply.kind === 'thinking')
    return (
      <Bubble from="shop">
        <ThemedText type="small" themeColor="textMuted">Thinking…</ThemedText>
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
      {reply.logId != null ? <Rating verdict={reply.verdict} onRate={onRate} onPick={onPick} /> : null}
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

/** "Was this what you asked?" Kept on the phone with the question, so real mistakes can be found and fixed. */
function Rating({ verdict, onRate, onPick }: { verdict?: Verdict; onRate: (v: Verdict) => void; onPick: (i: IntentId) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  if (verdict === 'right') return <ThemedText type="small" themeColor="textMuted">Thanks.</ThemedText>;
  if (verdict === 'wrong')
    return (
      <View style={{ gap: Spacing.two, alignItems: 'flex-start' }}>
        <ThemedText type="small" themeColor="textMuted">Sorry. What did you mean?</ThemedText>
        {STARTERS.map((i) => (
          <Chip key={i} label={SUGGESTION_WORDS[i]} onPress={() => onPick(i)} />
        ))}
      </View>
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
      <ThemedText type="small" themeColor="textMuted">Was this what you asked?</ThemedText>
      <Tap accessibilityRole="button" accessibilityLabel={t('Yes')} onPress={() => onRate('right')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="ThumbUp" size={22} color={theme.success} />
      </Tap>
      <Tap accessibilityRole="button" accessibilityLabel={t('No')} onPress={() => onRate('wrong')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="ThumbDown" size={22} color={theme.danger} />
      </Tap>
    </View>
  );
}
