import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSession } from '@/auth/session-provider';
import { PLATFORM_DOMAIN } from '@/auth/platform';
import { passwordChecks } from '@/auth/reset';
import { limitsLine, priceLine, type Plan } from '@/billing/logic';
import { AuthFrame } from '@/components/auth-frame';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Rule } from '@/components/password-rules';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { useDebounced } from '@/lib/use-debounced';
import { checkAddress, checkEmail, finishSignup, listSignupPlans, resendSignup, signupClient, startSignup, verifySignup } from '@/signup/api';
import { addressProblem, CATEGORIES, describeSignupError, EMPTY_FORM, emailProblem, ownerProblem, resendWait, shopHost, shopProblem, signupBase, signupBody, slugify, STEPS, type ShopForm, type Step } from '@/signup/logic';

/** The clock, read in handlers only (the resend wait counts from when a code was sent). */
const nowMs = () => Date.now();

/** Open a shop account from the phone: the shop, the owner, a plan, an emailed code, then a password. Five short steps, and nothing is created until the last. */
export default function SignupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = usePrefs();
  const { workspaceUrl, chooseWorkspace, signIn } = useSession();
  const client = useMemo(() => signupClient(signupBase(workspaceUrl, PLATFORM_DOMAIN)), [workspaceUrl]);

  const [step, setStep] = useState<Step>('shop');
  const [form, setForm] = useState<ShopForm>(EMPTY_FORM);
  const [addressEdited, setAddressEdited] = useState(false);
  const [shown, setShown] = useState(false);
  const [expires, setExpires] = useState(600);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => nowMs());
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ name: string; address: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [opening, setOpening] = useState<'trying' | 'failed'>('trying');

  const set = (patch: Partial<ShopForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setError(null);
  };
  const address = addressEdited ? form.address : slugify(form.shopName);

  // Is the web address free, and is the email new? Asked a moment after typing stops, and only when the shape is already right.
  const addr = useDebounced(address, 500);
  const mail = useDebounced(form.email.trim(), 500);
  const addrQ = useQuery({ queryKey: ['signup', 'address', addr], queryFn: () => checkAddress(client, addr), enabled: step === 'shop' && !addressProblem(addr), staleTime: 30_000 });
  const mailQ = useQuery({ queryKey: ['signup', 'email', mail], queryFn: () => checkEmail(client, mail), enabled: step === 'owner' && !emailProblem(mail), staleTime: 30_000 });
  const plansQ = useQuery({ queryKey: ['signup', 'plans'], queryFn: () => listSignupPlans(client), enabled: step === 'plan' });
  // The free plan is chosen to begin with, so nobody has to decide before they have seen the prices.
  const planCode = form.planCode || (plansQ.data?.length ? (plansQ.data.find((p) => Number(p.price) <= 0) ?? plansQ.data[0]).code : '');
  const f: ShopForm = { ...form, address, planCode };

  useEffect(() => {
    if (step !== 'code') return;
    const id = setInterval(() => setNow(nowMs()), 1000);
    return () => clearInterval(id);
  }, [step]);

  const start = useMutation({
    mutationFn: () => startSignup(client, signupBody(f)),
    onSuccess: (r) => {
      setExpires(r.expiresInSeconds);
      setSentAt(nowMs());
      setNow(nowMs());
      setCode('');
      setStep('code');
    },
    onError: (e) => {
      haptics.warning();
      setError(describeSignupError(e));
    },
  });
  const resend = useMutation({
    mutationFn: () => resendSignup(client, f.email),
    onSuccess: () => {
      haptics.success();
      setSentAt(nowMs());
      setNow(nowMs());
      setError(null);
    },
    onError: (e) => {
      haptics.warning();
      setError(describeSignupError(e));
    },
  });
  const verify = useMutation({
    mutationFn: () => verifySignup(client, f.email, code),
    onSuccess: (tk) => {
      setTicket(tk);
      setStep('password');
    },
    onError: (e) => {
      haptics.warning();
      setError(describeSignupError(e));
    },
  });
  const finish = useMutation({
    mutationFn: async () => {
      await finishSignup(client, ticket!, password);
      return { name: f.shopName.trim(), address };
    },
    onSuccess: async (shop) => {
      haptics.success();
      setMade(shop);
      // The account exists. Open the new shop and sign in with what was just set; if that does not work, the sign-in screen is one tap away.
      try {
        // On a development server the saved address stays as it is; anywhere else the new shop becomes the saved one.
        if (!/^http:\/\//.test(workspaceUrl ?? '')) await chooseWorkspace(shop.address);
        await signIn(f.email, password);
      } catch {
        setOpening('failed'); // the card below says so and offers "Sign in"
      }
    },
    onError: (e) => {
      haptics.warning();
      setExpired(e instanceof ApiError && e.code === 'TICKET_INVALID');
      setError(describeSignupError(e));
    },
  });

  const progress = STEPS.indexOf(step) + 1;
  const checks = passwordChecks(password, confirm);
  const addrTaken = addrQ.data?.available === false;
  const mailTaken = mailQ.data?.available === false;
  const waitLeft = resendWait(sentAt, now);
  const minutes = Math.max(1, Math.round(expires / 60));

  function next() {
    setShown(true);
    setError(null);
    if (step === 'shop') {
      if (shopProblem(f) || addrTaken) return;
      setShown(false);
      setStep('owner');
    } else if (step === 'owner') {
      if (ownerProblem(f) || mailTaken) return;
      setShown(false);
      setStep('plan');
    } else if (step === 'plan') {
      if (!f.planCode) return;
      start.mutate();
    }
  }
  const back = () => {
    setShown(false);
    setError(null);
    setStep(step === 'owner' ? 'shop' : step === 'plan' ? 'owner' : 'plan');
  };
  const prob = shown ? (step === 'shop' ? shopProblem(f) : step === 'owner' ? ownerProblem(f) : null) : null;
  const err = (k: keyof ShopForm) => (prob?.field === k ? t(prob.text) : undefined);

  if (made) {
    return (
      <AuthFrame title="Your shop is ready">
        <View style={{ gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 10, padding: 20, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.successBorder }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Check" size={30} color={theme.onBrand} strokeWidth={3} />
            </View>
            <ThemedText type="lead" literal style={{ textAlign: 'center' }}>
              {made.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" literal selectable style={{ textAlign: 'center' }}>
              {shopHost(made.address, PLATFORM_DOMAIN)}
            </ThemedText>
          </View>
          <Notice kind="info">{opening === 'trying' ? 'Opening your shop. If it does not open by itself, tap Sign in.' : 'Your shop is ready. Tap Sign in to open it.'}</Notice>
          <Button title="Sign in" onPress={() => router.replace({ pathname: '/workspace', params: { shop: made.address } })} />
        </View>
      </AuthFrame>
    );
  }

  const titles: Record<Step, { title: string; subtitle: string }> = {
    shop: { title: 'About your shop', subtitle: 'It takes about two minutes. You can change most of this later.' },
    owner: { title: 'About you', subtitle: 'This will be the owner of the shop.' },
    plan: { title: 'Choose a plan', subtitle: 'You are not charged now. You can move to a bigger plan any time.' },
    code: { title: 'Check your email', subtitle: '' },
    password: { title: 'Choose a password', subtitle: 'You will sign in with your email and this password.' },
  };

  return (
    <AuthFrame title={titles[step].title} subtitle={titles[step].subtitle ? t(titles[step].subtitle) : undefined}>
      <View style={{ gap: 16 }}>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEPS.length, now: progress }} style={{ gap: 6 }}>
          <ThemedText type="caption" themeColor="textMuted" literal>
            {t('Step {n} of {total}', { n: progress, total: STEPS.length })}
          </ThemedText>
          <View style={{ height: 6, borderRadius: Radius.full, backgroundColor: theme.border, overflow: 'hidden' }}>
            <View style={{ width: `${(progress / STEPS.length) * 100}%`, height: '100%', backgroundColor: theme.brand }} />
          </View>
        </View>

        {step === 'shop' ? (
          <>
            <Field label="Shop name" required value={form.shopName} onChangeText={(v) => set({ shopName: v })} autoCapitalize="words" error={err('shopName')} />
            <View style={{ gap: 6 }}>
              <ThemedText type="caption" themeColor="textSecondary">
                What do you sell?
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => {
                  const on = form.category === c.code;
                  return (
                    <Tap key={c.code} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={t(c.title)} onPress={() => set({ category: c.code })} style={{ minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
                      {on ? <Icon name="Check" size={16} color={theme.brandText} /> : null}
                      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.text }}>
                        {c.title}
                      </ThemedText>
                    </Tap>
                  );
                })}
              </View>
              {err('category') ? (
                <ThemedText type="caption" style={{ color: theme.danger }} literal>
                  {err('category')}
                </ThemedText>
              ) : null}
            </View>
            <Field label="Your shop's web address" value={address} onChangeText={(v) => { setAddressEdited(true); set({ address: v.toLowerCase().replace(/\s+/g, '-') }); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" error={err('address')} hint={shopHost(address, PLATFORM_DOMAIN)} />
            <AddressStatus address={address} checking={addrQ.isFetching} taken={addrTaken} free={addrQ.data?.available === true} failed={addrQ.isError} />
          </>
        ) : null}

        {step === 'owner' ? (
          <>
            <Field label="Your name" required value={form.ownerName} onChangeText={(v) => set({ ownerName: v })} autoCapitalize="words" autoComplete="name" error={err('ownerName')} />
            <Field label="Email" required value={form.email} onChangeText={(v) => set({ email: v })} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" hint="We send a code to this address." error={err('email')} />
            {mailTaken ? <Notice>That email already has an account. Sign in instead, or use another email.</Notice> : null}
            <Field label="Phone (optional)" value={form.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" placeholder="01XXXXXXXXX" error={err('phone')} />
          </>
        ) : null}

        {step === 'plan' ? (
          <>
            {plansQ.isPending ? (
              <ThemedText type="small" themeColor="textMuted">
                Loading plans…
              </ThemedText>
            ) : null}
            {plansQ.isError ? <Notice>Could not load the plans. Check your internet and try again.</Notice> : null}
            {plansQ.data?.map((p) => (
              <PlanOption key={p.id} plan={p} on={f.planCode === p.code} onPress={() => set({ planCode: p.code })} />
            ))}
          </>
        ) : null}

        {step === 'code' ? (
          <>
            <ThemedText type="body" literal>
              {t('We sent a code to {email}. It works for {n} minutes.', { email: f.email.trim(), n: minutes })}
            </ThemedText>
            <Field label="Code" value={code} onChangeText={(v) => { setCode(v.replace(/\D/g, '')); setError(null); }} keyboardType="number-pad" maxLength={12} autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="go" onSubmitEditing={() => code.length >= 4 && verify.mutate()} autoFocus />
          </>
        ) : null}

        {step === 'password' ? (
          <>
            <Field label="Password" value={password} onChangeText={(v) => { setPassword(v); setError(null); }} secret autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
            <Field label="Confirm password" value={confirm} onChangeText={(v) => { setConfirm(v); setError(null); }} secret autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => checks.long && checks.match && finish.mutate()} />
            <View style={{ gap: 6 }}>
              <Rule ok={checks.long} text="8 or more characters" />
              <Rule ok={checks.match} text="The two passwords match" />
            </View>
          </>
        ) : null}

        {error ? <Notice>{t(error)}</Notice> : null}

        {step === 'shop' || step === 'owner' || step === 'plan' ? <Button title={step === 'plan' ? 'Send me a code' : 'Continue'} loading={start.isPending} disabled={step === 'plan' && !f.planCode} onPress={next} /> : null}
        {step === 'code' ? <Button title="Check code" loading={verify.isPending} disabled={code.length < 4} onPress={() => verify.mutate()} /> : null}
        {step === 'password' ? <Button title="Open my shop" variant="success" loading={finish.isPending} disabled={!checks.long || !checks.match} onPress={() => finish.mutate()} /> : null}

        {step === 'code' ? (
          <>
            <LinkText text={waitLeft > 0 ? t('Send a new code in {n} seconds', { n: waitLeft }) : t('Send a new code')} disabled={waitLeft > 0 || resend.isPending} onPress={() => resend.mutate()} />
            <LinkText text={t('Wrong email? Go back')} onPress={() => { setError(null); setStep('owner'); }} />
          </>
        ) : null}
        {expired && step === 'password' ? <Button title="Start again" variant="secondary" onPress={() => { setStep('shop'); setTicket(null); setPassword(''); setConfirm(''); setError(null); setExpired(false); }} /> : null}
        {step === 'owner' || step === 'plan' ? <LinkText text={t('Back')} onPress={back} /> : null}
        <LinkText text={t('Already have a shop? Sign in')} onPress={() => router.replace('/workspace')} />
      </View>
    </AuthFrame>
  );
}

function LinkText({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityState={{ disabled: !!disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => ({ alignSelf: 'center', padding: 8, opacity: pressed || disabled ? 0.5 : 1 })}>
      <ThemedText type="small" literal style={{ color: disabled ? theme.textMuted : theme.brand }}>
        {text}
      </ThemedText>
    </Pressable>
  );
}

/** Whether the address is free, in words and an icon (never colour alone). Nothing shows until the shape is right and the check has run. */
function AddressStatus({ address, checking, taken, free, failed }: { address: string; checking: boolean; taken: boolean; free: boolean; failed: boolean }) {
  const theme = useTheme();
  const { t } = usePrefs();
  if (!address || addressProblem(address)) return null;
  const look = checking ? { icon: 'Pause' as const, color: theme.textSecondary, text: 'Checking…' } : taken ? { icon: 'Cancel' as const, color: theme.danger, text: 'That web address is taken or cannot be used. Choose another.' } : free ? { icon: 'CheckCircle' as const, color: theme.success, text: 'This address is free.' } : failed ? { icon: 'TriangleAlert' as const, color: theme.warning, text: 'Could not check the address. It will be checked again when you continue.' } : null;
  if (!look) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={look.icon} size={18} color={look.color} />
      <ThemedText type="small" style={{ color: look.color, flex: 1 }} literal>
        {t(look.text)}
      </ThemedText>
    </View>
  );
}

function PlanOption({ plan, on, onPress }: { plan: Plan; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const price = priceLine(plan);
  return (
    <Tap accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={plan.name} onPress={onPress} style={{ padding: 16, gap: 6, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={on ? 'CheckCircle' : 'Circle'} size={22} color={on ? theme.brandText : theme.textMuted} />
        <ThemedText type="bodyMedium" literal style={{ flex: 1, color: on ? theme.brandText : theme.text }}>
          {plan.name}
        </ThemedText>
        <ThemedText type="smallMedium" literal themeColor="textSecondary">
          {t(price.text, price.vars)}
        </ThemedText>
      </View>
      <ThemedText type="small" literal>
        {limitsLine(plan, t)}
      </ThemedText>
      {plan.trial_days > 0 ? (
        <ThemedText type="caption" themeColor="textMuted" literal>
          {t('{n} days free to try', { n: plan.trial_days })}
        </ThemedText>
      ) : null}
    </Tap>
  );
}
