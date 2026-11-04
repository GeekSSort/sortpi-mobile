import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Share, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { haptics } from '@/lib/haptics';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { Alert } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { formatBDT } from '@/lib/money';
import { closeShift, currentShift, shiftSummary } from '@/sell/api';
import { describeSellError } from '@/sell/messages';
import { countedProblem, drawerVariance } from '@/sell/shift-close';
import { useT } from '@/i18n/prefs';

/** Count the drawer and close the shift. The expected figure comes from the server: float plus cash sales, collections and cash in, less refunds and cash out. */
export default function EndShiftScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { me } = useSession();
  const canClose = me?.permissions?.includes('pos.shift_close') ?? false;
  const shift = useQuery({ queryKey: ['shift', me?.id ?? ''], queryFn: currentShift });
  const summary = useQuery({ queryKey: ['shift-summary', shift.data?.id], queryFn: () => shiftSummary(shift.data!.id), enabled: !!shift.data });
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  /** What the day came to, kept when the shift closes (the live figures disappear with the shift). */
  const [closed, setClosed] = useState<{ sales: number; total?: string; cash: string; variance: ReturnType<typeof drawerVariance> } | null>(null);

  const close = useMutation({
    mutationFn: () => closeShift(shift.data!.id, counted.trim(), note),
    onSuccess: async () => {
      if (s) setClosed({ sales: s.sale_count, total: s.total_sales, cash: counted.trim(), variance });
      haptics.success();
      qc.setQueryData(['shift', me?.id ?? ''], null);
      await qc.invalidateQueries({ queryKey: ['shift'] });
    },
    onError: (e) => setProblem(describeSellError(e)),
  });

  const s = summary.data;
  const variance = s ? drawerVariance(counted, s.expected_cash) : null;

  function submit() {
    const msg = countedProblem(counted);
    setProblem(msg);
    if (!msg) Alert.alert(t('Close the day?'), t('You cannot sell again until you start selling again.'), [{ text: t('Cancel'), style: 'cancel' }, { text: t('Yes, close'), onPress: () => close.mutate() }]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            {closed ? <DayClosed day={closed} shop={me?.organization?.name ?? 'SortPi'} onDone={() => router.back()} /> : null}
            {closed ? null : shift.isPending || (shift.data && summary.isPending) ? <ActivityIndicator color={theme.brand} /> : null}
            {!closed && shift.data === null ? <Notice kind="info">You have not started selling today.</Notice> : null}
            {!closed && summary.isError ? <Notice>Could not load the drawer figures. Check the connection.</Notice> : null}
            {!closed && !canClose ? <Notice>You are not allowed to close the day. Ask the owner or manager.</Notice> : null}
            {!closed && s ? (
              <>
                <View style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <Line label="Cash you started with" value={s.opening_cash} />
                  <Line label={t('Cash sales ({n})', { n: s.sale_count })} value={s.cash_sales} plus />
                  {s.cash_collected ? <Line label="Old dues received in cash" value={s.cash_collected} plus /> : null}
                  {s.cash_in ? <Line label="Cash added" value={s.cash_in} plus /> : null}
                  {s.cash_out ? <Line label="Cash taken out" value={s.cash_out} minus /> : null}
                  <Line label="Cash given back to customers" value={s.cash_refunds} minus />
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <ThemedText type="bodyMedium">Should be in your drawer</ThemedText>
                    <ThemedText type="bodyMedium">{formatBDT(s.expected_cash)}</ThemedText>
                  </View>
                </View>
                <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <Field label="Cash you counted" required prefix="৳" value={counted} onChangeText={(v) => { setCounted(v); setProblem(null); }} keyboardType="decimal-pad" placeholder="0.00" error={problem ?? undefined} />
                  {variance ? (
                    <ThemedText type="smallMedium" style={{ color: variance.kind === 'exact' ? theme.success : theme.danger }}>
                      {variance.kind === 'exact' ? 'Matches. Well done.' : variance.kind === 'short' ? t('Short by {amount}', { amount: formatBDT(variance.amount) }) : t('{amount} extra', { amount: formatBDT(variance.amount) })}
                    </ThemedText>
                  ) : null}
                  <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything the manager should know" />
                </View>
                <Button title="Close the day" size="lg" loading={close.isPending} disabled={!canClose} onPress={submit} />
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** The last moment of the day: a clear result to look at, and a message the shopkeeper can send to the owner. */
function DayClosed({ day, shop, onDone }: { day: { sales: number; total?: string; cash: string; variance: ReturnType<typeof drawerVariance> }; shop: string; onDone: () => void }) {
  const theme = useTheme();
  const t = useT();
  const v = day.variance;
  const cashLine = !v ? '' : v.kind === 'exact' ? t('Cash matches') : v.kind === 'short' ? t('Short by {amount}', { amount: formatBDT(v.amount) }) : t('{amount} extra', { amount: formatBDT(v.amount) });
  const message = [`${shop}`, t('Day closed'), t('Sales: {n}', { n: day.sales }), day.total ? `${t('Sold')}: ${formatBDT(day.total)}` : '', `${t('Cash counted')}: ${formatBDT(day.cash)}${cashLine ? ` (${cashLine})` : ''}`].filter(Boolean).join('\n');
  return (
    <View style={{ alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Check" size={40} color={theme.onBrand} strokeWidth={3} />
      </Animated.View>
      <ThemedText type="heading">Day closed</ThemedText>
      <Animated.View entering={FadeInUp.delay(200).duration(300)} style={{ alignSelf: 'stretch', alignItems: 'center', gap: 4, paddingVertical: Spacing.two }}>
        {day.total ? <ThemedText type="title">{formatBDT(day.total)}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('Sales: {n}', { n: day.sales })}
        </ThemedText>
        {v ? (
          <ThemedText type="smallMedium" style={{ color: v.kind === 'exact' ? theme.success : theme.danger }}>
            {cashLine}
          </ThemedText>
        ) : null}
      </Animated.View>
      <Button title="Send to the owner" variant="secondary" onPress={() => void Share.share({ message })} style={{ alignSelf: 'stretch' }} />
      <Button title="Done" onPress={onDone} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

function Line({ label, value, plus, minus }: { label: string; value: string; plus?: boolean; minus?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">
        {plus ? '+ ' : minus ? '− ' : ''}
        {formatBDT(value)}
      </ThemedText>
    </View>
  );
}
