import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { StepId } from '@/setup/steps';
import { useSetupChecklist } from '@/setup/use-setup-checklist';

import { Button } from './button';
import { Card } from './card';
import { Icon } from './icons/icon';
import { ThemedText } from './themed-text';
import { useT } from '@/i18n/prefs';

/** Where each step is done. */
const HREF: Record<StepId, '/add-product' | '/sell' | '/access'> = { product: '/add-product', sale: '/sell', staff: '/access' };

/** "Get started" card at the top of Home. Hides itself when everything is done, or when the person hides it. */
export function SetupChecklist() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const { checklist, loading, hidden, hide } = useSetupChecklist();

  if (loading || hidden || checklist.total === 0) return null;
  // Everything done: say so once, then never show the card again.
  if (checklist.complete) {
    return (
      <Animated.View entering={FadeInDown.duration(260)} style={{ alignItems: 'center', gap: 10, padding: 20, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.successBorder }}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.go, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Check" size={30} color={theme.onBrand} strokeWidth={3} />
        </Animated.View>
        <ThemedText type="lead" style={{ textAlign: 'center' }}>
          All set. Your shop is ready.
        </ThemedText>
        <Button title="Got it" onPress={() => void hide()} style={{ alignSelf: 'stretch' }} />
      </Animated.View>
    );
  }
  const { steps, doneCount, total } = checklist;

  return (
    <Card style={{ gap: 12, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="lead">Get started</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {doneCount} of {total} done
          </ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Hide checklist')} onPress={() => void hide()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', margin: -12 }}>
          <Icon name="X" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: doneCount }} style={{ height: 6, borderRadius: Radius.full, backgroundColor: theme.border, overflow: 'hidden' }}>
        <View style={{ width: `${(doneCount / total) * 100}%`, height: '100%', backgroundColor: theme.brand }} />
      </View>

      {steps.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={`${t(s.title)}${s.done ? t(', done') : ''}`}
          onPress={() => { const to = HREF[s.id]; if (to) router.push(to); }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: s.done ? theme.brand : theme.inputBorder,
              backgroundColor: s.done ? theme.brand : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {s.done ? <Icon name="Check" size={14} color={theme.onBrand} strokeWidth={3} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="bodyMedium" themeColor={s.done ? 'textMuted' : 'text'} style={s.done ? { textDecorationLine: 'line-through' } : undefined}>
              {s.title}
            </ThemedText>
            {!s.done ? (
              <ThemedText type="caption" themeColor="textMuted">
                {s.hint}
              </ThemedText>
            ) : null}
          </View>
          <Icon name="ChevronRight" size={18} color={theme.textMuted} />
        </Pressable>
      ))}
    </Card>
  );
}
