import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { Icon, type IconName } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { Tap } from '@/components/tap';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { GROUP_TITLE, groupMenu, MENU, visibleMenu } from '@/menu/items';

/** The account and the few switches a till needs: a profile header and grouped settings rows, like a system settings page. */
export default function MoreScreen() {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, scheme, setScheme, setGuideDone } = usePrefs();
  const { me, signOut, biometricAvailable, biometricEnabled, setBiometricEnabled } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const found = visibleMenu(MENU, me?.permissions, query, t);
  const name = me?.full_name || me?.email || '';
  const roles = me?.roles?.length ? me.roles.join(', ') : '';

  function confirmSignOut() {
    Alert.alert(t('Sign out?'), t('You will need to sign in again to sell.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }} style={{ backgroundColor: theme.canvas }}>
      {MENU.length > 0 ? (
        <View style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
          <Field label="Find a task" value={query} onChangeText={setQuery} placeholder="For example: sales, close the day" autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        </View>
      ) : null}
      {searching && found.length === 0 ? <EmptyState icon="Search" title={t('Nothing found')} hint={t('Try another word, like “sales” or “customer”.')} /> : null}
      {groupMenu(found).map((g) => (
        <View key={g.group}>
          <ThemedText type="smallMedium" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
            {GROUP_TITLE[g.group]}
          </ThemedText>
          <Group>
            {g.items.map((i) => (
              <Row key={i.id} icon={i.icon} title={i.title} sub={i.hint} onPress={() => router.push(i.route)} trailing={<Icon name="ChevronRight" size={18} color={theme.textMuted} />} />
            ))}
          </Group>
        </View>
      ))}
      {searching ? null : (
      <>
      <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.three }}>
        <View style={{ width: 72, height: 72, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
          <ThemedText type="display" style={{ color: theme.brandText }}>
            {name.trim().charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText type="title" selectable literal>
          {name}
        </ThemedText>
        {me?.full_name ? (
          <ThemedText type="small" themeColor="textMuted" selectable literal>
            {me.email}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {me?.organization.name}
          {me?.active_branch ? ` · ${me.active_branch.name}` : ''}
          {roles ? ` · ${roles}` : ''}
        </ThemedText>
      </View>

      {biometricAvailable ? (
        <Group>
          <Row icon="ScanFace" title={process.env.EXPO_OS === 'ios' ? 'Unlock with Face ID' : 'Unlock with fingerprint'} sub="Keeps your shop safe if someone else picks up your phone." trailing={<Switch value={biometricEnabled} onValueChange={(on) => void setBiometricEnabled(on)} trackColor={{ true: theme.brand }} />} />
        </Group>
      ) : null}

      <Group>
        <Choice title="Language" value={lang} options={[{ key: 'bn', label: 'বাংলা' }, { key: 'en', label: 'English' }]} onPick={(k) => void setLang(k)} />
        <Choice title="Text size" value={size} options={[{ key: 'normal', label: t('Normal') }, { key: 'large', label: t('Large') }, { key: 'xlarge', label: t('Extra large') }]} onPick={(k) => void setSize(k)} />
        <Choice title="Screen colours" value={scheme} options={[{ key: 'auto', label: t('Auto') }, { key: 'light', label: t('Light') }, { key: 'dark', label: t('Dark') }]} onPick={(k) => void setScheme(k)} />
        <Row icon="ChevronRight" title="Show the help again" onPress={() => void setGuideDone(false)} />
      </Group>

      <Group>
        <Row icon="LogOut" title="Sign out" danger onPress={confirmSignOut} />
      </Group>
      </>
      )}
    </ScrollView>
  );
}

/** A block of rows on the card colour with hairline dividers, edge to edge like a system list section. */
function Group({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, setGuideDone } = usePrefs();
  return <View style={{ marginBottom: Spacing.three, backgroundColor: theme.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>{children}</View>;
}

function Row({ icon, title, sub, trailing, danger, onPress }: { icon: IconName; title: string; sub?: string; trailing?: React.ReactNode; danger?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, setGuideDone } = usePrefs();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14 }}>
      <Icon name={icon} size={22} color={danger ? theme.danger : theme.brand} />
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={danger ? { color: theme.danger } : undefined}>
          {title}
        </ThemedText>
        {sub ? (
          <ThemedText type="caption" themeColor="textMuted">
            {sub}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: theme.backgroundSelected }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** A row with a few big buttons to pick one of: language, text size. */
function Choice<K extends string>({ title, value, options, onPick }: { title: string; value: K; options: { key: K; label: string }[]; onPick: (k: K) => void }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">
        {title}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Tap key={o.key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onPick(o.key)} style={{ overflow: 'hidden', flex: 1, minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? theme.brand : theme.inputBorder, backgroundColor: on ? theme.brandSoft : theme.card }}>
              <ThemedText type="smallMedium" style={{ color: on ? theme.brandText : theme.textSecondary }}>
                {o.label}
              </ThemedText>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
