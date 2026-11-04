import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Icon, type IconName } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { localDateISO } from '@/lib/dates';
import { Pill } from '@/products/variant-card';
import { attendanceOn, checkIn, checkOut, listStaff } from '@/team/api';
import { byPerson, checkInBody, checkOutBody, clock12, describeTeamError, fullName, nextSteps, presence, tally, type Attendance, type Presence, type Staff } from '@/team/logic';
import { showToast } from '@/ui/toast';

/** Who works for you and who is in today: tap a person to mark them in, out or absent. */
export default function TeamScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const perms = me?.permissions;
  const allowed = perms?.includes('hrm.view') ?? false;
  const today = localDateISO();
  const staff = useQuery({ queryKey: ['team', 'staff'], queryFn: listStaff, enabled: allowed });
  const day = useQuery({ queryKey: ['team', 'day', today], queryFn: () => attendanceOn(today), enabled: allowed });
  const [picked, setPicked] = useState<Staff | null>(null);

  const mark = useMutation({
    mutationFn: (a: { kind: 'in' | 'absent' | 'out'; who: Staff }) => (a.kind === 'out' ? checkOut(checkOutBody(a.who.id)) : checkIn(checkInBody(a.who.id, { absent: a.kind === 'absent' }))),
    onSuccess: (_r, a) => {
      haptics.success();
      showToast({ text: a.kind === 'out' ? t('{name} is marked out', { name: fullName(a.who) }) : a.kind === 'absent' ? t('{name} is marked absent', { name: fullName(a.who) }) : t('{name} is marked in', { name: fullName(a.who) }) });
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e) => {
      haptics.warning();
      showToast({ text: t(describeTeamError(e)) });
    },
  });

  if (!allowed) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see the team. Ask the owner or manager.</Notice>
      </View>
    );
  }
  const people = (staff.data ?? []).filter((s) => s.is_active).sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const records = byPerson(day.data ?? []);
  const sums = tally(people, records);
  const steps = picked ? nextSteps(presence(records.get(picked.id)), perms) : null;

  const header = (
    <View style={{ gap: Spacing.three, padding: Spacing.three }}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <ToneTile label="At work" icon="CheckCircle" tone="good" value={String(sums.in)} />
        <ToneTile label="Not marked yet" icon={sums.none ? 'TriangleAlert' : 'CheckCircle'} tone={sums.none ? 'warn' : 'good'} value={String(sums.none)} />
        <ToneTile label="Away" icon="X" tone={sums.absent + sums.leave ? 'bad' : undefined} value={String(sums.absent + sums.leave)} />
      </View>
      {staff.isError || day.isError ? <ErrorState message={t('Could not load the team.')} onRetry={() => void Promise.all([staff.refetch(), day.refetch()])} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Your team') }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={people}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StaffRow person={item} record={records.get(item.id)} onPress={() => setPicked(item)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={staff.isPending ? <SkeletonRows /> : <EmptyState icon="Users" title="No staff yet" hint="People you add to your team on the computer show up here." />}
        refreshing={staff.isRefetching || day.isRefetching}
        onRefresh={() => void Promise.all([staff.refetch(), day.refetch()])}
        contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
      />
      <ActionSheet
        title={picked ? fullName(picked) : null}
        actions={[
          ...(steps?.checkIn && picked ? [{ title: t('Mark in now'), icon: 'CheckCircle' as IconName, onPress: () => mark.mutate({ kind: 'in', who: picked }) }] : []),
          ...(steps?.checkOut && picked ? [{ title: t('Mark out now'), icon: 'LogOut' as IconName, onPress: () => mark.mutate({ kind: 'out', who: picked }) }] : []),
          ...(steps?.absent && picked ? [{ title: t('Mark absent'), icon: 'X' as IconName, onPress: () => mark.mutate({ kind: 'absent', who: picked }) }] : []),
          ...(picked?.phone ? [{ title: t('Call {phone}', { phone: picked.phone }), icon: 'Phone' as IconName, onPress: () => void Linking.openURL(`tel:${picked.phone}`) }] : []),
        ]}
        onClose={() => setPicked(null)}
      />
    </View>
  );
}

function useLook() {
  const theme = useTheme();
  const { t } = usePrefs();
  return (p: Presence, a: Attendance | undefined): { fg: string; soft: string; line: string; icon: IconName; word: string } => {
    const good = { fg: theme.success, soft: theme.successSoft, line: theme.successBorder, icon: 'CheckCircle' as IconName };
    if (p === 'in') return { ...good, word: a?.check_in ? t('In since {time}', { time: clock12(a.check_in) }) : t('At work') };
    if (p === 'half') return { ...good, word: t('Half day') };
    if (p === 'out') return { fg: theme.textSecondary, soft: theme.canvas, line: theme.border, icon: 'LogOut', word: t('Left at {time}', { time: clock12(a?.check_out) }) };
    if (p === 'absent') return { fg: theme.danger, soft: theme.dangerSoft, line: theme.dangerBorder, icon: 'X', word: t('Absent') };
    if (p === 'leave') return { fg: theme.brandText, soft: theme.brandSoft, line: theme.brandSoftBorder, icon: 'Package', word: t('On leave') };
    return { fg: theme.warning, soft: theme.warningSoft, line: `${theme.warning}55`, icon: 'TriangleAlert', word: t('Not marked yet') };
  };
}

function StaffRow({ person, record, onPress }: { person: Staff; record: Attendance | undefined; onPress: () => void }) {
  const theme = useTheme();
  const look = useLook()(presence(record), record);
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${fullName(person)}, ${look.word}`} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, backgroundColor: theme.card, borderLeftWidth: 6, borderLeftColor: look.fg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText type="bodyMedium" numberOfLines={1} literal>
          {fullName(person)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} literal>
          {[person.designation_name, person.branch_name].filter(Boolean).join(' · ')}
        </ThemedText>
        <Pill icon={look.icon} text={look.word} fg={look.fg} soft={look.soft} line={look.line} />
      </View>
      <Icon name="ChevronRight" size={16} color={theme.textMuted} />
    </Tap>
  );
}
