import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useDesktopShell } from '@/hooks/use-desktop-shell';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { sameName } from '@/lib/names';
import { MENU, visibleMenu } from '@/menu/items';
import { routePath, SHORT_TITLE, topTasks } from '@/menu/pinned';
import { bumpUsage, loadUsage, type Usage } from '@/menu/usage';

import { ProfileSettings, TaskList } from './menu-content';

const SLIDE_MS = 220;

type Drawer = { open: () => void; close: () => void; openProfile: () => void };
const Ctx = createContext<Drawer>({ open: () => undefined, close: () => undefined, openProfile: () => undefined });
export const useDrawer = (): Drawer => useContext(Ctx);

/**
 * The side menu: every task, one slide from the left. It sits over whatever screen is up, so it works from any tab. The bottom tabs
 * stay for the four things a till does all day; this holds the rest. Who is signed in and the important settings are not in it: its
 * footer opens them in a bottom sheet.
 */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false); // the panel exists
  const [wanted, setWanted] = useState(false); // the panel should be in
  const [profile, setProfile] = useState(false); // the profile and settings sheet
  const t = useT();
  const open = useCallback(() => {
    setShown(true);
    setWanted(true);
  }, []);
  const close = useCallback(() => setWanted(false), []);
  const openProfile = useCallback(() => {
    setWanted(false);
    setProfile(true);
  }, []);
  // Leave the panel in place until it has slid out.
  useEffect(() => {
    if (wanted || !shown) return;
    const id = setTimeout(() => setShown(false), SLIDE_MS + 30);
    return () => clearTimeout(id);
  }, [wanted, shown]);
  const value = useMemo(() => ({ open, close, openProfile }), [open, close, openProfile]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {shown ? <SidePanel wanted={wanted} close={close} openProfile={openProfile} /> : null}
      <BottomSheet visible={profile} onClose={() => setProfile(false)} title={t('Profile & quick settings')}>
        <ProfileSettings onDone={() => setProfile(false)} />
      </BottomSheet>
    </Ctx.Provider>
  );
}

function SidePanel({ wanted, close, openProfile }: { wanted: boolean; close: () => void; openProfile: () => void }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.86, 360);
  const slide = useSharedValue(0);
  useEffect(() => {
    slide.value = withTiming(wanted ? 1 : 0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
  }, [wanted, slide]);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (slide.value - 1) * panelWidth }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: slide.value * 0.45 }));

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000' }, scrimStyle]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Close the menu')} onPress={close} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: panelWidth, backgroundColor: theme.canvas, paddingTop: insets.top, paddingBottom: insets.bottom, boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)' }, panelStyle]}>
          <MenuPanelContent close={close} openProfile={openProfile} />
        </Animated.View>
      </View>
    </Modal>
  );
}

/** The six things this person opens most, as big buttons at the top of the open menu. They rearrange only when the app starts. */
function PinnedTasks() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const { me } = useSession();
  const [counts, setCounts] = useState<Usage | null>(null);
  const userId = me?.id;
  useEffect(() => {
    let alive = true;
    if (userId) void loadUsage(userId).then((u) => { if (alive) setCounts((prev) => prev ?? u); });
    return () => { alive = false; };
  }, [userId]);
  const trades = (me?.organization as { category?: { features?: string[] } } | undefined)?.category?.features;
  const items = useMemo(() => topTasks(visibleMenu(MENU, me?.permissions, '', (x) => x, trades), counts ?? {}), [me?.permissions, trades, counts]);
  if (items.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      {items.map((i) => {
        const href = routePath(i.route);
        const on = path === href || (href !== '/' && path.startsWith(`${href}/`));
        const label = t(SHORT_TITLE[i.id] ?? i.title);
        return (
          <Tap key={i.id} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => { bumpUsage(userId, i.id); router.navigate(i.route); }} style={{ width: '31.5%', minHeight: 60, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, borderRadius: Radius.md, backgroundColor: on ? theme.brandSoft : 'transparent' }}>
            <Icon name={i.icon} size={22} color={on ? theme.brandText : theme.brand} />
            <ThemedText type="caption" numberOfLines={2} style={{ textAlign: 'center', color: on ? theme.brandText : theme.text }}>{label}</ThemedText>
          </Tap>
        );
      })}
    </View>
  );
}

function MenuPanelContent({ close, openProfile, branded }: { close?: () => void; openProfile: () => void; branded?: boolean }) {
  const theme = useTheme();
  const t = useT();
  const { me } = useSession();
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: Spacing.three, paddingRight: Spacing.two, paddingVertical: Spacing.two, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ flex: 1 }}>
          {branded ? (
            <Image source={require('@/assets/images/sortpi-wordmark.png')} accessibilityLabel="SortPi" accessible contentFit="contain" style={{ width: 128, height: 32 }} />
          ) : (
            <ThemedText type="heading" literal numberOfLines={1}>
              {close ? (me?.organization.name ?? 'SortPi') : t('Menu')}
            </ThemedText>
          )}
          {close && me?.active_branch && !sameName(me.active_branch.name, me.organization.name) ? (
            <ThemedText type="caption" themeColor="textMuted" literal numberOfLines={1}>
              {me.active_branch.name}
            </ThemedText>
          ) : null}
        </View>
        {close ? (
          <Tap accessibilityRole="button" accessibilityLabel={t('Close the menu')} onPress={close} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="X" size={22} color={theme.textSecondary} />
          </Tap>
        ) : null}
      </View>
      {branded ? <PinnedTasks /> : null}
      <View style={{ flex: 1 }}>
        {/* The scrollbar stays visible and a soft fade closes the list, so a row sliced by the footer reads as "more below", not as a cut. */}
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} showsVerticalScrollIndicator persistentScrollbar contentContainerStyle={{ paddingBottom: branded ? 40 : Spacing.three }}>
          <TaskList compact onNavigate={close} />
        </ScrollView>
        {branded ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 32, experimental_backgroundImage: `linear-gradient(to bottom, ${theme.canvas}00, ${theme.canvas})` }} /> : null}
      </View>
      <Tap accessibilityRole="button" accessibilityLabel={t('Profile & quick settings')} onPress={openProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border }}>
        <View style={{ width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
          <ThemedText type="heading" style={{ color: theme.brandText }}>
            {(me?.full_name || me?.email || '?').trim().charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="bodyMedium" literal numberOfLines={1}>
            {me?.full_name || me?.email || ''}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
            {t('Profile & quick settings')}
          </ThemedText>
        </View>
        <Icon name="ChevronRight" size={20} color={theme.textMuted} />
      </Tap>
    </>
  );
}

export function HomeSidebar({ width, branded }: { width: number; branded?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { openProfile } = useDrawer();

  return (
    <View style={{ width, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.canvas, borderEndWidth: 1, borderColor: theme.border }}>
      <MenuPanelContent openProfile={openProfile} branded={branded} />
    </View>
  );
}

/** The ☰ button that opens the side menu. */
export function MenuButton() {
  const theme = useTheme();
  const t = useT();
  const { open } = useDrawer();
  if (useDesktopShell()) return null; // the menu is already open beside the screen
  return (
    <Tap accessibilityRole="button" accessibilityLabel={t('Open the menu')} onPress={open} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="Menu" size={24} color={theme.text} />
    </Tap>
  );
}

/** The back arrow and the menu button side by side, for every page that is not a main tab. The menu stays on the side the drawer opens from. */
export function BackWithMenu() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Tap accessibilityRole="button" accessibilityLabel={t('Back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="ChevronLeft" size={26} color={theme.text} />
      </Tap>
      <MenuButton />
    </View>
  );
}
