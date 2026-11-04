import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newIdempotencyKey } from '@/api/idempotency';
import { useSession } from '@/auth/session-provider';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { createCategory, createVoucher, listCategories } from '@/money/api';
import { dayChoice, describeMoneyError, isAmount, permissionFor, voucherBody, type DayChoice, type MoneyType } from '@/money/logic';
import { showToast } from '@/ui/toast';

/** Write down money that came in or went out: how much, what for, and which day. Few boxes, big buttons. */
export default function AddMoneyScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const { type: raw } = useLocalSearchParams<{ type?: string }>();
  const type: MoneyType = raw === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const income = type === 'INCOME';
  const allowed = me?.permissions?.includes(permissionFor(type, 'create')) ?? false;
  const canMakeCategory = me?.permissions?.includes(income ? 'income_category.create' : 'expense_category.create') ?? false;

  const [amount, setAmount] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [day, setDay] = useState<DayChoice>('today');
  const [note, setNote] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const key = useRef<string | null>(null);

  const categories = useQuery({ queryKey: ['money-categories', type], queryFn: () => listCategories(type), enabled: allowed, staleTime: 60_000 });
  const list = categories.data ?? [];
  // One category needs no choosing; with none at all (a new shop) the box to make the first one is open already.
  const categoryId = picked ?? (list.length === 1 ? list[0].id : null);
  const showNew = canMakeCategory && (adding || (categories.isSuccess && list.length === 0));

  const makeCategory = useMutation({
    mutationFn: () => createCategory(type, newName),
    onSuccess: (c) => {
      haptics.tap();
      setPicked(c.id);
      setNewName('');
      setAdding(false);
      void queryClient.invalidateQueries({ queryKey: ['money-categories', type] });
    },
    onError: (e) => showToast({ text: t(describeMoneyError(e)) }),
  });

  const save = useMutation({
    mutationFn: () => createVoucher(voucherBody({ type, categoryId: categoryId!, amount, date: dayChoice(day), note, branchId: me?.active_branch?.id }), key.current!),
    onSuccess: () => {
      haptics.success();
      showToast({ text: income ? t('Money in saved') : t('Money out saved') });
      void queryClient.invalidateQueries({ queryKey: ['money'] });
      router.back();
    },
    onError: () => haptics.warning(),
  });

  const ready = isAmount(amount) && !!categoryId;
  const touch = () => {
    key.current = null; // an edited entry is a new attempt
    save.reset();
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: income ? t('Add money in') : t('Add money out') }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five }}>
          {!allowed ? <Notice>You do not have permission to do that.</Notice> : null}
          {allowed ? (
            <>
              <Field label={income ? 'How much came in?' : 'How much went out?'} value={amount} onChangeText={(v) => { touch(); setAmount(v); }} keyboardType="decimal-pad" prefix="৳" placeholder="0" autoFocus error={amount.trim() && !isAmount(amount) ? 'Use numbers only, like 250 or 99.50.' : undefined} />

              <View style={{ gap: Spacing.two }}>
                <ThemedText type="smallMedium">{income ? 'What is it for? (where it came from)' : 'What is it for?'}</ThemedText>
                {categories.isPending ? <SkeletonRows count={1} /> : null}
                {categories.isError ? <ErrorState message={t('Could not load the list of reasons.')} onRetry={() => void categories.refetch()} /> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
                  {list.map((c) => {
                    const on = categoryId === c.id;
                    return (
                      <Tap key={c.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { touch(); setPicked(c.id); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border, backgroundColor: on ? theme.brandSoft : theme.card }}>
                        {on ? <Icon name="Check" size={16} color={theme.brandText} /> : null}
                        <ThemedText type="smallMedium" literal style={{ color: on ? theme.brandText : theme.textSecondary }}>
                          {c.name}
                        </ThemedText>
                      </Tap>
                    );
                  })}
                  {canMakeCategory && !showNew && categories.isSuccess ? (
                    <Tap accessibilityRole="button" onPress={() => setAdding(true)} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: Radius.full, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.brand }}>
                      <Icon name="Plus" size={16} color={theme.brandText} />
                      <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                        New reason
                      </ThemedText>
                    </Tap>
                  ) : null}
                </View>
                {categories.isSuccess && list.length === 0 && !canMakeCategory ? <Notice kind="info">There are no reasons yet. Ask your manager to add one.</Notice> : null}
                {showNew ? (
                  <View style={{ gap: Spacing.two }}>
                    <Field label="Name of the new reason" value={newName} onChangeText={setNewName} placeholder={income ? 'For example: Other income' : 'For example: Rent, Tea, Electricity'} />
                    <Button title="Add this reason" variant="secondary" loading={makeCategory.isPending} disabled={!newName.trim()} onPress={() => makeCategory.mutate()} />
                  </View>
                ) : null}
              </View>

              <View style={{ gap: Spacing.two }}>
                <ThemedText type="smallMedium">Which day?</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  {(['today', 'yesterday'] as const).map((d) => {
                    const on = day === d;
                    return (
                      <Tap key={d} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { touch(); setDay(d); }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1.5, borderColor: on ? theme.brand : theme.border, backgroundColor: on ? theme.brandSoft : theme.card }}>
                        <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                          {d === 'today' ? 'Today' : 'Yesterday'}
                        </ThemedText>
                      </Tap>
                    );
                  })}
                </View>
              </View>

              <Field label="Note (optional)" value={note} onChangeText={(v) => { touch(); setNote(v); }} placeholder="For example: shop rent for November" />

              {save.isError ? <Notice>{describeMoneyError(save.error)}</Notice> : null}
              <Button
                title={income ? 'Save money in' : 'Save money out'}
                variant={income ? 'success' : 'primary'}
                size="lg"
                loading={save.isPending}
                disabled={!ready}
                onPress={() => {
                  key.current ??= newIdempotencyKey();
                  save.mutate();
                }}
              />
            </>
          ) : null}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
