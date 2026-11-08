import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { useLocalShop } from '@/local/provider';
import { Icon, type IconName } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { Tap } from '@/components/tap';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { usePaperPref } from '@/sell/paper-pref';
import { GROUP_ICON, GROUP_TITLE, groupMenu, MENU, visibleMenu, type MenuGroup, type MenuItem } from '@/menu/items';

/** Every task the person may do, with a search box: the body of the side drawer. `onNavigate` lets the drawer close itself. */
export function TaskList({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean } = {}) {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<MenuGroup[]>([]);
  const searching = query.trim().length > 0;
  const trades = (me?.organization as { category?: { features?: string[] } } | undefined)?.category?.features;
  const code = (me?.organization as { category?: { code?: string } } | undefined)?.category?.code ?? '';
  const found = visibleMenu(MENU, me?.permissions, query, t, trades);

  return (
    <>
      {MENU.length > 0 ? (
        <View style={{ paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two }}>
          <Field label="Find a task" value={query} onChangeText={setQuery} placeholder="For example: sales, close the day" autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        </View>
      ) : null}
      {searching && found.length === 0 ? <EmptyState icon="Search" title={t('Nothing found')} hint={t('Try another word, like “sales” or “customer”.')} /> : null}
      {groupMenu(found).map((g) => {
        const go = (i: MenuItem) => () => {
          onNavigate?.();
          router.push(i.route);
        };
        // a section with one row of its own name (Dashboard) is just a row, as on the web
        const only = g.items.length === 1 && g.items[0].title === GROUP_TITLE[g.group] ? g.items[0] : null;
        if (only) {
          return (
            <Group key={g.group} tight>
              <Row compact icon={only.icon} title={only.tradeTitle?.[code] ?? only.title} onPress={go(only)} />
            </Group>
          );
        }
        const expanded = searching || open.includes(g.group);
        return (
          <Group key={g.group} tight>
            <Row
              compact
              icon={GROUP_ICON[g.group]}
              title={GROUP_TITLE[g.group]}
              expanded={expanded}
              onPress={() => setOpen((o) => (o.includes(g.group) ? o.filter((x) => x !== g.group) : [...o, g.group]))}
              trailing={<Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={18} color={theme.textMuted} />}
            />
            {expanded ? g.items.map((i) => <Row key={i.id} compact indent icon={i.icon} title={i.tradeTitle?.[code] ?? i.title} onPress={go(i)} />) : null}
          </Group>
        );
      })}
    </>
  );
}

/**
 * Who is signed in and the few switches a till needs: a profile header and grouped settings rows, like a system settings page.
 * This is what the profile bottom sheet shows; the features themselves live in the drawer. `onDone` closes the sheet.
 */
export function ProfileSettings({ onDone }: { onDone?: () => void } = {}) {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, scheme, setScheme, setGuideDone } = usePrefs();
  const [paper, setPaper] = usePaperPref();
  const shop = useLocalShop();
  const { me, signOut, biometricAvailable, biometricEnabled, setBiometricEnabled } = useSession();
  const name = me?.full_name || me?.email || '';
  const roles = me?.roles?.length ? me.roles.join(', ') : '';

  function confirmSignOut() {
    Alert.alert(t('Sign out?'), t('You will need to sign in again to sell.'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign out'), style: 'destructive', onPress: () => void signOut() },
    ]);
  }

  return (
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

      {shop.allowed ? (
        <Group>
          <Row
            icon="Package"
            title="Shop on this phone"
            sub={shop.error ? t(shop.error) : shop.syncedAt ? t('Updated {time} · {n} items', { time: new Date(shop.syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), n: shop.products }) : t('Not downloaded yet')}
            trailing={
              shop.syncing ? (
                <ActivityIndicator color={theme.brand} />
              ) : (
                <Tap accessibilityRole="button" onPress={() => void shop.syncNow()} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 }}>
                  <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                    {t('Update')}
                  </ThemedText>
                </Tap>
              )
            }
          />
        </Group>
      ) : null}

      <Group>
        <Choice title="Language" value={lang} options={[{ key: 'bn', label: 'বাংলা' }, { key: 'en', label: 'English' }]} onPick={(k) => void setLang(k)} />
        <Choice title="Text size" value={size} options={[{ key: 'normal', label: t('Normal') }, { key: 'large', label: t('Large') }, { key: 'xlarge', label: t('Extra large') }]} onPick={(k) => void setSize(k)} />
        <Choice title="Screen colours" value={scheme} options={[{ key: 'auto', label: t('Auto') }, { key: 'light', label: t('Light') }, { key: 'dark', label: t('Dark') }]} onPick={(k) => void setScheme(k)} />
        <Choice title="Receipt paper" value={paper ?? 'ask'} options={[{ key: '58mm', label: '58 mm' }, { key: '80mm', label: '80 mm' }, { key: 'a4', label: 'A4' }, { key: 'ask', label: t('Ask') }]} onPick={(k) => void setPaper(k)} />
        <Row icon="ChevronRight" title="Show the help again" onPress={() => { void setGuideDone(false); onDone?.(); }} />
      </Group>

      <Group>
        <Row icon="LogOut" title="Sign out" danger onPress={confirmSignOut} />
      </Group>
    </>
  );
}

/** Both together, as one page: where someone lands when their role has no other tab (the hidden More route). */
export function MenuContent() {
  const theme = useTheme();
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }} style={{ backgroundColor: theme.canvas }}>
      <TaskList />
      <ProfileSettings />
    </ScrollView>
  );
}

/** A block of rows on the card colour with hairline dividers, edge to edge like a system list section. */
function Group({ children, tight }: { children: React.ReactNode; tight?: boolean }) {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, setGuideDone } = usePrefs();
  return <View style={{ marginBottom: tight ? Spacing.two : Spacing.three, backgroundColor: theme.card, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>{children}</View>;
}

function Row({ icon, title, sub, trailing, danger, compact, indent, expanded, onPress }: { icon: IconName; title: string; sub?: string; trailing?: React.ReactNode; danger?: boolean; compact?: boolean; indent?: boolean; expanded?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  const { t, lang, setLang, size, setSize, setGuideDone } = usePrefs();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingLeft: indent ? Spacing.three + 34 : Spacing.three, paddingRight: Spacing.three, paddingVertical: compact ? 11 : 14 }}>
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
    <Pressable accessibilityRole="button" accessibilityState={expanded === undefined ? undefined : { expanded }} onPress={onPress} android_ripple={{ color: theme.backgroundSelected }}>
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
