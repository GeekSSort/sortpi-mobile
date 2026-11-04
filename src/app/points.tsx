import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, Switch, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
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
import { formatBDT } from '@/lib/money';
import { resolvedSettings, saveMany } from '@/settings/api';
import { describeSettingsError } from '@/settings/logic';
import { BASES, POINT_TYPE, cleanNumber, earnedFor, givenBack, pointChanges, pointsProblem, readPoints, type Basis, type Mode, type PointField, type Points } from '@/settings/points';
import { showToast } from '@/ui/toast';

const RESOLVED = ['settings', 'resolved'];
/** The spend the example sentence uses, in taka. */
const EXAMPLE = '1000';
/** Above this share of the spend coming back, the screen warns that the shop gives a lot away. */
const GENEROUS = 10;

/** How customers earn points and what the points are worth at the till. Every rule is the server's; this only sets them. */
export default function PointsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('settings.view');
  const canEdit = perms.includes('settings.update');
  const q = useQuery({ queryKey: RESOLVED, queryFn: resolvedSettings, enabled: canSee });
  const saved = q.data ? readPoints(q.data) : null;
  const [edits, setEdits] = useState<Partial<Points>>({});
  const [leaving, setLeaving] = useState(false);
  const [shown, setShown] = useState(false);
  const now: Points | null = saved ? { ...saved, ...edits } : null;
  const changes = saved && now ? pointChanges(saved, now) : [];
  const dirty = changes.length > 0;
  const problem = now ? pointsProblem(now) : null;

  const save = useMutation({
    mutationFn: (list: typeof changes) => saveMany(list.map((c) => ({ ...c, type: POINT_TYPE[c.key] }))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      setEdits({});
      setShown(false);
      haptics.success();
      showToast({ text: t('Saved') });
    },
    onError: () => {
      haptics.warning();
      // Some of the changes may have gone through before the refusal: read them again so the screen tells the truth.
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  usePreventRemove(dirty && !leaving && !save.isPending, ({ repeat }) =>
    Alert.alert(t('Leave without saving?'), t('What you changed will be lost.'), [
      { text: t('Keep editing'), style: 'cancel' },
      { text: t('Leave'), style: 'destructive', onPress: () => { setLeaving(true); repeat(); } },
    ]),
  );

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const set = <K extends keyof Points>(k: K, v: Points[K]) => {
    setEdits((e) => ({ ...e, [k]: v }));
    save.reset();
  };
  const num = (k: PointField, decimal: boolean) => (v: string) => set(k, cleanNumber(v, decimal) as never);
  const err = (k: PointField) => (shown && problem?.field === k ? t(problem.text) : undefined);
  function submit() {
    setShown(true);
    if (!now || problem || !dirty) return;
    save.mutate(changes);
  }
  const back = now ? givenBack(now) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Customer points') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            {q.isError ? <ErrorState message={t('Could not load your settings.')} onRetry={() => void q.refetch()} /> : null}
            {q.isPending ? <SkeletonRows /> : null}
            {now ? (
              <>
                {!canEdit ? <Notice kind="info">You can look at these, but only the owner can change them.</Notice> : null}
                {saved && saved.ownHere.length ? <Notice kind="info">This branch has its own values for some of these. Change them on the computer.</Notice> : null}

                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <ThemedText type="bodyMedium">Give customers points</ThemedText>
                      <ThemedText type="caption" themeColor="textMuted">
                        {now.enabled ? 'Customers earn points on what they buy and can spend them at the till.' : 'Off. Customers earn nothing and the till shows no points.'}
                      </ThemedText>
                    </View>
                    <Switch accessibilityLabel={t('Give customers points')} value={now.enabled} disabled={!canEdit || save.isPending} onValueChange={(v) => set('enabled', v)} trackColor={{ true: theme.brand }} thumbColor={now.enabled ? theme.onBrand : undefined} />
                  </View>
                </Card>

                {now.enabled ? (
                  <>
                    <Heading icon="Gift" title="Earning points" />
                    <Card>
                      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        <View style={{ flex: 1 }}>
                          <Field label="For every" value={now.earnPerAmount} onChangeText={num('earnPerAmount', true)} editable={canEdit} keyboardType="decimal-pad" prefix="৳" error={err('earnPerAmount')} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field label="Customer gets (points)" value={now.earnPoints} onChangeText={num('earnPoints', false)} editable={canEdit} keyboardType="number-pad" error={err('earnPoints')} />
                        </View>
                      </View>
                      <View style={{ gap: 6 }}>
                        <ThemedText type="caption" themeColor="textSecondary">
                          Points are counted on
                        </ThemedText>
                        {BASES.map((b) => (
                          <Choice key={b.code} title={b.title} hint={b.hint} on={now.basis === b.code} disabled={!canEdit} onPress={() => set('basis', b.code as Basis)} />
                        ))}
                      </View>
                    </Card>

                    <Heading icon="Tag" title="Spending points" />
                    <Card>
                      <View style={{ gap: 6 }}>
                        <ThemedText type="caption" themeColor="textSecondary">
                          Points take off
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                          <ModeButton label="Taka" icon="Cash" on={now.mode === 'FLAT'} disabled={!canEdit} onPress={() => set('mode', 'FLAT' as Mode)} />
                          <ModeButton label="Percent" icon="Percent" on={now.mode === 'PERCENT'} disabled={!canEdit} onPress={() => set('mode', 'PERCENT' as Mode)} />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        <View style={{ flex: 1 }}>
                          <Field label="Points in one set" value={now.redeemPoints} onChangeText={num('redeemPoints', false)} editable={canEdit} keyboardType="number-pad" error={err('redeemPoints')} />
                        </View>
                        <View style={{ flex: 1 }}>
                          {now.mode === 'FLAT' ? <Field label="Taka off per set" value={now.redeemValue} onChangeText={num('redeemValue', true)} editable={canEdit} keyboardType="decimal-pad" prefix="৳" error={err('redeemValue')} /> : <Field label="Percent off per set" value={now.redeemPercent} onChangeText={num('redeemPercent', true)} editable={canEdit} keyboardType="decimal-pad" error={err('redeemPercent')} />}
                        </View>
                      </View>
                      <Field label="Fewest points before spending" hint="Type 0 for no minimum." value={now.minRedeem} onChangeText={num('minRedeem', false)} editable={canEdit} keyboardType="number-pad" error={err('minRedeem')} />
                      <Field label="Most points in one sale" hint="Type 0 for no limit." value={now.maxPerSale} onChangeText={num('maxPerSale', false)} editable={canEdit} keyboardType="number-pad" error={err('maxPerSale')} />
                      {now.mode === 'FLAT' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <ThemedText type="bodyMedium">Spend any number of points</ThemedText>
                            <ThemedText type="caption" themeColor="textMuted">
                              {now.partial ? 'A customer can spend 130 points. Each point is worth the same.' : 'Only whole sets can be spent. 130 points spends 100 and keeps 30.'}
                            </ThemedText>
                          </View>
                          <Switch accessibilityLabel={t('Spend any number of points')} value={now.partial} disabled={!canEdit || save.isPending} onValueChange={(v) => set('partial', v)} trackColor={{ true: theme.brand }} thumbColor={now.partial ? theme.onBrand : undefined} />
                        </View>
                      ) : null}
                    </Card>

                    {!problem ? (
                      <Card tone="info">
                        <ThemedText type="smallMedium">In short</ThemedText>
                        <ThemedText type="small" literal>
                          {t('A {amount} bill gives {n} points.', { amount: formatBDT(EXAMPLE, { dp: 0 }), n: earnedFor(now, EXAMPLE) })}
                        </ThemedText>
                        <ThemedText type="small" literal>{now.mode === 'FLAT' ? t('{n} points take off {amount}.', { n: now.redeemPoints, amount: formatBDT(now.redeemValue, { dp: 2 }) }) : t('{n} points take off {pct}% of the bill.', { n: now.redeemPoints, pct: now.redeemPercent })}</ThemedText>
                        {back !== null ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon name={Number(back) > GENEROUS ? 'TriangleAlert' : 'CheckCircle'} size={18} color={Number(back) > GENEROUS ? theme.warning : theme.success} />
                            <ThemedText type="smallMedium" literal style={{ flex: 1, color: Number(back) > GENEROUS ? theme.warning : theme.success }}>
                              {Number(back) > GENEROUS ? t('About {n}% of what customers spend comes back to them. That is a lot.', { n: back }) : t('About {n}% of what customers spend comes back to them.', { n: back })}
                            </ThemedText>
                          </View>
                        ) : null}
                      </Card>
                    ) : null}
                  </>
                ) : null}

                {save.isError ? <Notice>{t(describeSettingsError(save.error))}</Notice> : null}
                {canEdit ? <Button title="Save" variant="success" size="lg" loading={save.isPending} disabled={!dirty} onPress={submit} /> : null}
              </>
            ) : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Card({ children, tone }: { children: React.ReactNode; tone?: 'info' }) {
  const theme = useTheme();
  return <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: tone === 'info' ? theme.brandSoft : theme.card, borderWidth: 1, borderColor: tone === 'info' ? theme.brand : theme.border }}>{children}</View>;
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

function Choice({ title, hint, on, disabled, onPress }: { title: string; hint: string; on: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Tap accessibilityRole="radio" accessibilityState={{ selected: on, disabled }} accessibilityLabel={t(title)} onPress={onPress} disabled={disabled} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
      <Icon name={on ? 'CheckCircle' : 'Circle'} size={22} color={on ? theme.brandText : theme.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" style={{ color: on ? theme.brandText : theme.text }}>
          {title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      </View>
    </Tap>
  );
}

function ModeButton({ label, icon, on, disabled, onPress }: { label: string; icon: 'Percent' | 'Cash'; on: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  return (
    <Tap accessibilityRole="radio" accessibilityState={{ selected: on, disabled }} accessibilityLabel={t(label)} onPress={onPress} disabled={disabled} style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
      <Icon name={icon} size={20} color={on ? theme.brandText : theme.textSecondary} />
      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.text }}>
        {label}
      </ThemedText>
      {on ? <Icon name="Check" size={16} color={theme.brandText} /> : null}
    </Tap>
  );
}
