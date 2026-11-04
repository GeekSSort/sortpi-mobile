import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Keyboard, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { HeaderAction } from '@/components/header-action';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { Pill } from '@/products/variant-card';
import { addCoupon, changeCoupon, listCoupons, removeCoupon } from '@/settings/api';
import { couponBody, couponProblem, describeCouponError, plainValue, sortCoupons, worthOf, type Coupon, type CouponMode, type CouponProblem } from '@/settings/shop-details';
import { showToast } from '@/ui/toast';

const KEY = ['settings', 'coupons'];

/** Codes the shop hands out. A customer says the code at the till and the bill goes down by the amount set here. Add, change, switch off, remove. */
export default function CouponsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('settings.view');
  const canEdit = perms.includes('settings.update');
  const q = useQuery({ queryKey: KEY, queryFn: listCoupons, enabled: canSee });
  const [sheet, setSheet] = useState<{ mode: 'add' } | { mode: 'edit'; coupon: Coupon } | null>(null);

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const list = q.data ? sortCoupons(q.data) : [];
  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Coupons'), headerRight: canEdit && q.data ? () => <HeaderAction title="Add" icon="Plus" onPress={() => setSheet({ mode: 'add' })} /> : undefined }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={list}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CouponRow coupon={item} onPress={canEdit ? () => setSheet({ mode: 'edit', coupon: item }) : undefined} />}
        ListHeaderComponent={
          <View style={{ gap: Spacing.three, padding: Spacing.three }}>
            <Notice kind="info">A customer says the code at the till. The bill goes down by the amount you set here.</Notice>
            {!canEdit ? <Notice kind="info">You can look at these, but only the owner can change them.</Notice> : null}
            {q.isError ? <ErrorState message={t('Could not load your coupons.')} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={q.isPending ? <SkeletonRows /> : q.isError ? undefined : <EmptyState icon="Ticket" title="No coupons yet" hint="Make a code to hand to your customers." action={canEdit ? { title: 'Add', onPress: () => setSheet({ mode: 'add' }) } : undefined} />}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      {sheet && q.data ? <CouponSheet key={sheet.mode === 'edit' ? sheet.coupon.id : 'add'} current={sheet.mode === 'edit' ? sheet.coupon : undefined} list={q.data} onClose={() => setSheet(null)} /> : null}
    </View>
  );
}

function CouponRow({ coupon, onPress }: { coupon: Coupon; onPress?: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const worth = worthOf(coupon);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={coupon.code} onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 14, paddingHorizontal: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: coupon.is_active ? theme.success : theme.textMuted, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {coupon.code}
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Pill icon={coupon.mode === 'PERCENT' ? 'Percent' : 'Cash'} text={t(worth.text, worth.vars)} fg={theme.brandText} soft={theme.brandSoft} line={theme.brandText} />
          {coupon.is_active ? <Pill icon="CheckCircle" text={t('On')} fg={theme.success} soft={theme.successSoft} line={theme.success} /> : <Pill icon="Pause" text={t('Off')} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} />}
        </View>
      </View>
      {onPress ? <Icon name="ChevronRight" size={16} color={theme.textMuted} /> : null}
    </Tap>
  );
}

function CouponSheet({ current, list, onClose }: { current?: Coupon; list: Coupon[]; onClose: () => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const [code, setCode] = useState(current?.code ?? '');
  const [mode, setMode] = useState<CouponMode>(current?.mode ?? 'PERCENT');
  const [value, setValue] = useState(current ? plainValue(current.value) : '');
  const [active, setActive] = useState(current?.is_active ?? true);
  const [problem, setProblem] = useState<CouponProblem | null>(null);

  const done = (text: string) => {
    Keyboard.dismiss();
    haptics.success();
    showToast({ text: t(text) });
    void queryClient.invalidateQueries({ queryKey: KEY });
    onClose();
  };
  const save = useMutation({
    mutationFn: () => {
      const body = couponBody(code, mode, value);
      return current ? changeCoupon(current.id, { ...body, is_active: active }) : addCoupon(body);
    },
    onSuccess: () => done('Saved'),
    onError: () => haptics.warning(),
  });
  const remove = useMutation({
    mutationFn: () => removeCoupon(current!.id),
    onSuccess: () => done('Removed'),
    onError: () => haptics.warning(),
  });
  const busy = save.isPending || remove.isPending;
  const error = save.error ?? remove.error;

  function submit() {
    const p = couponProblem(code, mode, value, list, current?.id);
    setProblem(p);
    if (!p) save.mutate();
  }
  function askRemove() {
    Alert.alert(t('Remove “{name}”?', { name: current?.code ?? '' }), t('Customers can no longer use it. Old sales stay as they were.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, remove it'), style: 'destructive', onPress: () => remove.mutate() }]);
  }
  const touch = () => {
    setProblem(null);
    save.reset();
    remove.reset();
  };
  return (
    <BottomSheet visible onClose={() => !busy && onClose()} title={current ? 'Change this coupon' : 'Add a coupon'}>
      <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.three }}>
        <Field label="Code" value={code} onChangeText={(v) => { setCode(v); touch(); }} autoCapitalize="characters" autoCorrect={false} placeholder="For example EID25" error={problem?.field === 'code' ? t(problem.text) : undefined} autoFocus={!current} />
        <View style={{ gap: 6 }}>
          <ThemedText type="caption" themeColor="textSecondary">
            It takes off
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <ModeButton label="Percent" icon="Percent" on={mode === 'PERCENT'} onPress={() => { setMode('PERCENT'); touch(); }} />
            <ModeButton label="Taka" icon="Cash" on={mode === 'FLAT'} onPress={() => { setMode('FLAT'); touch(); }} />
          </View>
        </View>
        <Field label={mode === 'PERCENT' ? 'Percent off' : 'Taka off'} value={value} onChangeText={(v) => { setValue(v); touch(); }} keyboardType="decimal-pad" prefix={mode === 'FLAT' ? '৳' : undefined} error={problem?.field === 'value' ? t(problem.text) : undefined} onSubmitEditing={submit} />
        {current ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three }}>
            <View style={{ flex: 1 }}>
              <ThemedText type="bodyMedium">Customers can use it</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                Switch it off to stop it without losing it.
              </ThemedText>
            </View>
            <Switch accessibilityLabel={t('Customers can use it')} value={active} disabled={busy} onValueChange={(v) => { setActive(v); touch(); }} trackColor={{ true: theme.brand }} thumbColor={active ? theme.onBrand : undefined} />
          </View>
        ) : null}
        {error ? <Notice>{t(describeCouponError(error))}</Notice> : null}
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="Cancel" variant="secondary" disabled={busy} onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save" variant="success" loading={save.isPending} disabled={remove.isPending} onPress={submit} style={{ flex: 1 }} />
        </View>
        {current ? (
          <Tap accessibilityRole="button" onPress={askRemove} disabled={busy} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1.5, borderColor: theme.dangerBorder }}>
            <Icon name="Trash2" size={20} color={theme.danger} />
            <ThemedText type="smallMedium" style={{ color: theme.danger }}>
              Remove this coupon
            </ThemedText>
          </Tap>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function ModeButton({ label, icon, on, onPress }: { label: string; icon: 'Percent' | 'Cash'; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Tap accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: on ? theme.brandSoft : theme.card, borderWidth: on ? 2 : 1, borderColor: on ? theme.brand : theme.inputBorder }}>
      <Icon name={icon} size={20} color={on ? theme.brandText : theme.textSecondary} />
      <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.text }}>
        {label}
      </ThemedText>
      {on ? <Icon name="Check" size={16} color={theme.brandText} /> : null}
    </Tap>
  );
}
