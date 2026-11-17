import { View } from 'react-native';

import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n/prefs';

import { discard, tryAgain, useOutbox } from './runner';

/** What has been saved on this phone but not sent to the shop yet: waiting items in blue, stuck ones in red with what to do about them. */
export function OutboxNotice() {
  const t = useT();
  const rows = useOutbox();
  if (!rows.length) return null;
  const waiting = rows.filter((r) => r.state === 'pending');
  const stuck = rows.filter((r) => r.state === 'failed');
  const nameOf = (payload: string) => (JSON.parse(payload) as { name?: string }).name ?? '';
  return (
    <View style={{ gap: Spacing.two }}>
      {waiting.length ? (
        <Notice kind="info">
          {waiting.length === 1
            ? t('Saved on this phone, sending to the shop: {name}', { name: nameOf(waiting[0].payload) })
            : t('{n} items saved on this phone, sending to the shop', { n: waiting.length })}
        </Notice>
      ) : null}
      {stuck.map((r) => (
        <View key={r.id} style={{ gap: Spacing.one }}>
          <Notice>{t('Could not send {name}: {why}', { name: nameOf(r.payload), why: t(r.error ?? 'Try again.') })}</Notice>
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <Button title={t('Try again')} variant="secondary" onPress={() => void tryAgain(r.id)} style={{ flex: 1 }} />
            <Button title={t('Remove')} variant="secondary" onPress={() => void discard(r.id)} style={{ flex: 1 }} />
          </View>
          {r.step >= 1 ? <ThemedText type="small" themeColor="textSecondary">{t('The item is already in the shop; only the stock or photo is missing.')}</ThemedText> : null}
        </View>
      ))}
    </View>
  );
}
