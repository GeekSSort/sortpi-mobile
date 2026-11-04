import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icons/icon';
import { ThemedText } from './themed-text';
import { useT } from '@/i18n/prefs';
import { BIG_TEXT, useTextFactor } from '@/i18n/text-factor';

export type Tone = 'good' | 'bad' | 'warn' | 'danger' | 'warning' | undefined;

/**
 * A figure with a colour that says what it means before it is read: green is fine or money in, red is owed or finished,
 * orange is running low, plain is just a count. A picture sits beside the label, so colour is never the only clue.
 */
export function ToneTile({ label, value, note, tone, icon, delay = 0, onPress, selected }: { label: string; value: string; note?: string; tone?: Tone; icon?: IconName; delay?: number; onPress?: () => void; selected?: boolean }) {
  const theme = useTheme();
  const t = useT();
  const big = useTextFactor() > BIG_TEXT;
  const kind = tone === 'danger' ? 'bad' : tone === 'warning' ? 'warn' : tone;
  const c = kind === 'good' ? { bg: theme.successSoft, fg: theme.success, line: theme.successBorder } : kind === 'bad' ? { bg: theme.dangerSoft, fg: theme.danger, line: theme.dangerBorder } : kind === 'warn' ? { bg: theme.warningSoft, fg: theme.warning, line: `${theme.warning}55` } : { bg: theme.card, fg: theme.text, line: theme.border };
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={big ? { flexGrow: 1, flexBasis: '47%' } : { flex: 1 }}>
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress && selected !== undefined ? { selected } : undefined}
      accessibilityLabel={onPress ? `${t(label)}: ${value}` : undefined}
      onPress={onPress}
      android_ripple={onPress ? { color: c.line } : undefined}
      style={{ flex: 1, padding: Spacing.three, gap: 4, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: c.bg, borderWidth: selected ? 2.5 : 1, borderColor: selected ? c.fg : c.line }}>
      <View style={{ flexDirection: big ? 'column' : 'row', alignItems: big ? 'flex-start' : 'center', gap: 8 }}>
        {icon ? (
          <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: kind ? c.fg : theme.brand }}>
            <Icon name={icon} size={16} color={theme.card} />
          </View>
        ) : null}
        <ThemedText type="caption" themeColor="textSecondary" style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </ThemedText>
        {/* A tile that goes somewhere says so; a tile that filters shows its chosen state by the thick edge instead. */}
        {onPress && selected === undefined ? (
          <View style={big ? { position: 'absolute', top: -4, right: -4 } : undefined}>
            <Icon name="ChevronRight" size={16} color={theme.textMuted} />
          </View>
        ) : null}
      </View>
      <ThemedText type="title" numberOfLines={1} adjustsFontSizeToFit style={{ color: c.fg }}>
        {value}
      </ThemedText>
      {note ? (
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
          {note}
        </ThemedText>
      ) : null}
    </Pressable>
    </Animated.View>
  );
}
