import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { ToneTile } from '@/components/tone-tile';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { DailyBars } from '@/reports/sections';

import type { Answer } from './model';

/** One answer: the sentence first, then the figures, the list, a warning if there is one, and exactly one button. */
export function AnswerCard({ a, onAsk }: { a: Answer; onAsk: (intent: NonNullable<Answer['action']['ask']>) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const dates = a.bars?.map((b) => b.date).sort();
  const tone = (x?: 'good' | 'warn' | 'bad') => (x === 'bad' ? theme.danger : x === 'warn' ? theme.warning : x === 'good' ? theme.success : theme.text);
  return (
    <Card accessibilityLiveRegion="polite" style={{ gap: Spacing.three }}>
      <ThemedText type="heading">{t(a.title)}</ThemedText>
      {a.when ? <ThemedText type="small" themeColor="textMuted" literal>{t(a.when)}</ThemedText> : null}
      <ThemedText type="body" literal>{t(a.lead.text, a.lead.params)}</ThemedText>
      {a.stats?.length ? (
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {a.stats.map((s) => (
            <ToneTile key={s.label} label={s.label} value={s.value} note={s.note} tone={s.tone} />
          ))}
        </View>
      ) : null}
      {a.bars && dates?.length ? <DailyBars rows={a.bars} from={dates[0]} to={dates[dates.length - 1]} /> : null}
      {a.rows?.length ? (
        <View style={{ gap: Spacing.two }}>
          {a.rows.map((r, i) => (
            <View key={`${r.primary}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodyMedium" literal>{r.primary}</ThemedText>
                {r.secondary ? <ThemedText type="small" themeColor="textMuted" literal>{r.secondary}</ThemedText> : null}
              </View>
              {r.value ? <ThemedText type="bodyMedium" style={{ color: tone(r.tone) }} literal>{r.value}</ThemedText> : null}
            </View>
          ))}
        </View>
      ) : null}
      {a.alert ? (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }}>
          <Icon name="TriangleAlert" size={20} color={tone(a.alert.tone)} />
          <ThemedText type="small" style={{ flex: 1, color: tone(a.alert.tone) }} literal>{t(a.alert.text.text, a.alert.text.params)}</ThemedText>
        </View>
      ) : null}
      <Button title={a.action.label} variant="primary" trailing={<Icon name="ArrowRight" size={20} color="#fff" />} onPress={() => (a.action.route ? router.push(a.action.route as never) : a.action.ask ? onAsk(a.action.ask) : undefined)} />
    </Card>
  );
}
