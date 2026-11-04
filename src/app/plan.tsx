import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, RefreshControl, ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { cancelRequest, fileRequest, getSubscription, listPlans, listRequests } from '@/billing/api';
import { LIMIT_KEYS, LIMIT_WORD, METHODS, choiceFor, limitsLine, dayText, describeBillingError, meter, periodLine, priceLine, requestBody, requestLook, requestProblem, statusLook, type Plan, type RequestForm, type Subscription, type Tone, type UpgradeRequest } from '@/billing/logic';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Pill } from '@/products/variant-card';
import { cleanNumber } from '@/settings/points';
import { groupBD } from '@/lib/money';
import { showToast } from '@/ui/toast';

const SUB = ['billing', 'subscription'];
const PLANS = ['billing', 'plans'];
const REQS = ['billing', 'requests'];

/** Which SortPi plan the shop is on, how much of it is used, and how to move up. Nothing is charged here: the shop pays SortPi first, then tells SortPi. */
export default function PlanScreen() {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('billing.view');
  const canManage = perms.includes('billing.manage');
  const sub = useQuery({ queryKey: SUB, queryFn: getSubscription, enabled: canSee });
  const plans = useQuery({ queryKey: PLANS, queryFn: listPlans, enabled: canSee });
  const reqs = useQuery({ queryKey: REQS, queryFn: listRequests, enabled: canSee });
  const [moving, setMoving] = useState<Plan | null>(null);
  const [cancelNote, setCancelNote] = useState<string | null>(null);

  const cancel = useMutation({
    mutationFn: (id: string) => cancelRequest(id),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Request cancelled') });
      setCancelNote(null);
      void queryClient.invalidateQueries({ queryKey: REQS });
    },
    onError: (e) => {
      haptics.warning();
      setCancelNote(describeBillingError(e));
      void queryClient.invalidateQueries({ queryKey: REQS });
    },
  });

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const s = sub.data ?? null;
  const loading = sub.isPending || plans.isPending || reqs.isPending;
  const failed = sub.isError || plans.isError;
  const pending = reqs.data?.find((r) => r.status === 'PENDING') ?? null;
  const refresh = () => {
    void sub.refetch();
    void plans.refetch();
    void reqs.refetch();
  };

  function askCancel(r: UpgradeRequest) {
    Alert.alert(t('Cancel this request?'), t('SortPi will not look at it. If you have already paid, ask SortPi support.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, cancel it'), style: 'destructive', onPress: () => cancel.mutate(r.id) }]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Your plan') }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" refreshControl={<RefreshControl refreshing={sub.isRefetching || plans.isRefetching} onRefresh={refresh} />} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {failed ? <ErrorState message={t('Could not load your plan.')} onRetry={refresh} /> : null}
        {loading && !failed ? <SkeletonRows /> : null}

        {!loading && !failed && !s ? <Notice kind="info">Your shop has no plan on record, so nothing is limited. If that seems wrong, ask SortPi support.</Notice> : null}
        {s ? <PlanCard s={s} lang={lang} /> : null}
        {s && (s.status === 'SUSPENDED' || s.status === 'CANCELLED') ? <Notice>Your plan has stopped. Contact SortPi support to start it again.</Notice> : null}
        {s ? <Usage s={s} /> : null}

        {pending ? (
          <Card tone="info">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="Pause" size={20} color={theme.brandText} />
              <ThemedText type="bodyMedium" style={{ flex: 1, color: theme.brandText }} literal>
                {t('Your request to move to {plan} is waiting for SortPi.', { plan: pending.plan.name })}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" literal>
              {t('Sent {date}. Transaction number {id}.', { date: dayText(pending.created_at, lang), id: pending.transaction_id })}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              Your plan changes once SortPi has seen the payment. Until then nothing changes.
            </ThemedText>
            {cancelNote ? <Notice>{t(cancelNote)}</Notice> : null}
            {canManage ? <Button title="Cancel this request" variant="secondary" loading={cancel.isPending} onPress={() => askCancel(pending)} /> : null}
          </Card>
        ) : null}

        {plans.data?.length ? <Heading icon="CreditCard" title="Plans" /> : null}
        {plans.data?.map((p) => (
          <PlanRow key={p.id} plan={p} sub={s} canMove={!!s && canManage && !pending && s.status !== 'SUSPENDED' && s.status !== 'CANCELLED'} onMove={() => setMoving(p)} />
        ))}
        {s && canManage && !pending && plans.data?.length ? (
          <ThemedText type="caption" themeColor="textMuted">
            There is no card payment in this app. You pay SortPi first, by bKash, bank transfer or card, then send the payment details here.
          </ThemedText>
        ) : null}

        {reqs.data?.some((r) => r.status !== 'PENDING') ? <Heading icon="Receipt" title="Your earlier requests" /> : null}
        {reqs.data
          ?.filter((r) => r.status !== 'PENDING')
          .slice(0, 5)
          .map((r) => <RequestRow key={r.id} r={r} lang={lang} />)}
      </ScrollView>
      {moving && s ? <MoveSheet plan={moving} onClose={() => setMoving(null)} /> : null}
    </View>
  );
}

function useTone() {
  const theme = useTheme();
  return (tone: Tone) => (tone === 'good' ? { fg: theme.success, soft: theme.successSoft } : tone === 'warn' ? { fg: theme.warning, soft: theme.warningSoft } : tone === 'bad' ? { fg: theme.danger, soft: theme.dangerSoft } : tone === 'info' ? { fg: theme.brandText, soft: theme.brandSoft } : { fg: theme.textSecondary, soft: theme.canvas });
}

function Card({ children, tone }: { children: React.ReactNode; tone?: 'info' }) {
  const theme = useTheme();
  return <View style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: tone === 'info' ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: tone === 'info' ? theme.brand : theme.border }}>{children}</View>;
}

function Heading({ icon, title }: { icon: IconName; title: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: Spacing.two }}>
      <Icon name={icon} size={18} color={theme.textSecondary} />
      <ThemedText type="smallMedium" themeColor="textSecondary">
        {title}
      </ThemedText>
    </View>
  );
}

function PlanCard({ s, lang }: { s: Subscription; lang: 'en' | 'bn' }) {
  const { t } = usePrefs();
  const tone = useTone();
  const look = statusLook(s.status);
  const c = tone(look.tone);
  const line = periodLine(s, new Date(), lang);
  const price = priceLine(s.plan);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ThemedText type="lead" literal style={{ flexShrink: 1 }}>
          {s.plan.name}
        </ThemedText>
        <Pill icon={look.icon} text={t(look.text)} fg={c.fg} soft={c.soft} line={c.fg} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" literal>
        {t(price.text, price.vars)}
      </ThemedText>
      {line ? (
        <ThemedText type="bodyMedium" literal>
          {t(line.text, line.vars)}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function Usage({ s }: { s: Subscription }) {
  const { t } = usePrefs();
  const theme = useTheme();
  const tone = useTone();
  return (
    <Card>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        What you use
      </ThemedText>
      {LIMIT_KEYS.map((k) => {
        const m = meter(s.usage[k], s.limits[k] === undefined ? s.plan[k] : s.limits[k]);
        const c = tone(m.tone);
        const word = t(m.limit === 1 ? LIMIT_WORD[k].one : LIMIT_WORD[k].many);
        return (
          <View key={k} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
              <ThemedText type="small" literal>
                {word}
              </ThemedText>
              <ThemedText type="smallMedium" literal style={{ color: m.limit === null ? theme.textSecondary : c.fg, fontVariant: ['tabular-nums'] }}>
                {m.limit === null ? t('{n} used. No limit.', { n: groupBD(String(m.used)) }) : m.full ? t('{n} of {limit}. Full.', { n: groupBD(String(m.used)), limit: groupBD(String(m.limit)) }) : t('{n} of {limit}', { n: groupBD(String(m.used)), limit: groupBD(String(m.limit)) })}
              </ThemedText>
            </View>
            {m.limit !== null ? (
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: m.limit, now: Math.min(m.used, m.limit) }} style={{ height: 8, borderRadius: Radius.full, backgroundColor: theme.border, overflow: 'hidden' }}>
                <View style={{ width: `${m.pct}%`, height: '100%', backgroundColor: c.fg }} />
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

function PlanRow({ plan, sub, canMove, onMove }: { plan: Plan; sub: Subscription | null; canMove: boolean; onMove: () => void }) {
  const { t } = usePrefs();
  const theme = useTheme();
  const tone = useTone();
  const price = priceLine(plan);
  const choice = sub ? choiceFor(sub, plan) : null;
  const here = choice?.kind === 'current';
  return (
    <View style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: here ? 2 : 1, borderColor: here ? theme.success : theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ThemedText type="bodyMedium" literal style={{ flexShrink: 1 }}>
          {plan.name}
        </ThemedText>
        {here ? <Pill icon="CheckCircle" text={t('Your plan')} fg={tone('good').fg} soft={tone('good').soft} line={tone('good').fg} /> : null}
        <ThemedText type="smallMedium" themeColor="textSecondary" literal style={{ marginLeft: 'auto' }}>
          {t(price.text, price.vars)}
        </ThemedText>
      </View>
      {plan.description ? (
        <ThemedText type="caption" themeColor="textMuted" literal>
          {plan.description}
        </ThemedText>
      ) : null}
      <ThemedText type="small" literal>
        {limitsLine(plan, t)}
      </ThemedText>
      {plan.trial_days > 0 && !here ? (
        <ThemedText type="caption" themeColor="textMuted" literal>
          {t('{n} days free trial', { n: plan.trial_days })}
        </ThemedText>
      ) : null}
      {choice?.kind === 'smaller' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="TriangleAlert" size={16} color={theme.warning} />
          <ThemedText type="caption" literal style={{ flex: 1, color: theme.warning }}>
            {t('Smaller than your plan: fewer {what}.', { what: choice.what.map((k) => t(LIMIT_WORD[k].many)).join(', ') })}
          </ThemedText>
        </View>
      ) : null}
      {choice?.kind === 'ok' && canMove ? <Button title="Move to this plan" variant="secondary" onPress={onMove} /> : null}
    </View>
  );
}

function RequestRow({ r, lang }: { r: UpgradeRequest; lang: 'en' | 'bn' }) {
  const { t } = usePrefs();
  const tone = useTone();
  const look = requestLook(r.status);
  const c = tone(look.tone);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ThemedText type="bodyMedium" literal style={{ flexShrink: 1 }}>
          {r.plan.name}
        </ThemedText>
        <Pill icon={look.icon} text={t(look.text)} fg={c.fg} soft={c.soft} line={c.fg} />
      </View>
      <ThemedText type="caption" themeColor="textMuted" literal>
        {t('Sent {date}. Transaction number {id}.', { date: dayText(r.created_at, lang), id: r.transaction_id })}
      </ThemedText>
      {r.status === 'REJECTED' && r.decision_note ? (
        <ThemedText type="small" literal>
          {r.decision_note}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function MoveSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RequestForm>({ method: 'MOBILE_BANKING', transactionId: '', amount: '', note: '' });
  const [shown, setShown] = useState(false);
  const problem = requestProblem(form);
  const price = priceLine(plan);
  const send = useMutation({
    mutationFn: () => fileRequest(requestBody(plan.code, form)),
    onSuccess: () => {
      Keyboard.dismiss();
      haptics.success();
      showToast({ text: t('Request sent to SortPi') });
      void queryClient.invalidateQueries({ queryKey: REQS });
      onClose();
    },
    onError: () => {
      haptics.warning();
      // A repeat after a lost connection is refused as "already waiting": read the list so the screen shows it.
      void queryClient.invalidateQueries({ queryKey: REQS });
    },
  });
  const set = (patch: Partial<RequestForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    send.reset();
  };
  const err = (f: 'transactionId' | 'amount' | 'note') => (shown && problem?.field === f ? t(problem.text) : undefined);
  function submit() {
    setShown(true);
    if (!problem) send.mutate();
  }
  return (
    <BottomSheet visible onClose={() => !send.isPending && onClose()} title="Move to a bigger plan">
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
            <ThemedText type="bodyMedium" literal style={{ flexShrink: 1 }}>
              {plan.name}
            </ThemedText>
            <ThemedText type="bodyMedium" literal>
              {t(price.text, price.vars)}
            </ThemedText>
          </View>
          <Notice kind="info">Nothing is charged here. Pay SortPi first, then send the payment details. Your plan changes once SortPi has seen the payment.</Notice>
          <View style={{ gap: 6 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              How did you pay?
            </ThemedText>
            {METHODS.map((m) => {
              const on = form.method === m.code;
              return (
                <Tap key={m.code} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={t(m.title)} onPress={() => set({ method: m.code })} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
                  <Icon name={on ? 'CheckCircle' : 'Circle'} size={22} color={on ? theme.brandText : theme.textMuted} />
                  <ThemedText type="bodyMedium" style={{ color: on ? theme.brandText : theme.text }}>
                    {m.title}
                  </ThemedText>
                </Tap>
              );
            })}
          </View>
          <Field label="Transaction number" required value={form.transactionId} onChangeText={(v) => set({ transactionId: v })} autoCapitalize="characters" autoCorrect={false} returnKeyType="send" onSubmitEditing={submit} error={err('transactionId')} />
          <Field label="Amount you paid (optional)" value={form.amount} onChangeText={(v) => set({ amount: cleanNumber(v, true) })} keyboardType="decimal-pad" prefix="৳" onSubmitEditing={submit} error={err('amount')} />
          {send.error ? <Notice>{t(describeBillingError(send.error))}</Notice> : null}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button title="Cancel" variant="secondary" disabled={send.isPending} onPress={onClose} style={{ flex: 1 }} />
            <Button title="Send request" variant="success" loading={send.isPending} onPress={submit} style={{ flex: 1 }} />
          </View>
      </View>
    </BottomSheet>
  );
}
