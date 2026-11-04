import { useState } from 'react';
import { Keyboard, Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { compareMoney, formatBDT } from '@/lib/money';
import { Pill } from '@/products/variant-card';

import { couponText, describeDiscountError } from './discounts';
import type { Discounts } from './use-discounts';

/** Under the pay step: a coupon code, the customer's points, and the sum that shows what the customer will really pay. */
export function DiscountBlock({ d, total, customerName }: { d: Discounts; total: string; customerName?: string }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const changed = !!d.totals && compareMoney(d.totals.final, total) !== 0;
  const pointsKnown = d.loyalty?.enabled && !!customerName;
  // The keyboard goes down before the field is replaced by the applied coupon: a focused field removed under an open keyboard hung the app on the emulator.
  const apply = () => {
    if (!draft.trim()) return;
    Keyboard.dismiss();
    d.applyCoupon(draft);
  };
  // An error belongs to the code that was tried, so it goes away as soon as the code is edited.
  const shownError = d.couponError && d.appliedCode === couponText(draft) ? t(describeDiscountError(d.couponError)) : undefined;

  return (
    <View style={{ gap: 10 }}>
      {d.coupon ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, backgroundColor: theme.successSoft, borderWidth: 1, borderColor: theme.successBorder }}>
          <Icon name="Tag" size={20} color={theme.success} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallMedium" literal style={{ color: theme.success }}>
              {t('Coupon {code}: take off {amount}', { code: d.coupon.code, amount: formatBDT(d.coupon.discount) })}
            </ThemedText>
            {d.coupon.description ? (
              <ThemedText type="caption" themeColor="textMuted" literal>
                {d.coupon.description}
              </ThemedText>
            ) : null}
          </View>
          <Tap accessibilityRole="button" accessibilityLabel={t('Remove the coupon')} onPress={() => { d.removeCoupon(); setDraft(''); }} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="X" size={18} color={theme.textSecondary} />
          </Tap>
        </View>
      ) : open ? (
        <View style={{ gap: 8 }}>
          <Field label="Coupon code" value={draft} onChangeText={setDraft} autoCapitalize="characters" autoCorrect={false} error={shownError} onSubmitEditing={apply} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Cancel" variant="secondary" onPress={() => { setOpen(false); setDraft(''); d.removeCoupon(); }} style={{ flex: 1 }} />
            <Button title="Apply" loading={d.couponBusy} disabled={!draft.trim()} onPress={apply} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Tap accessibilityRole="button" onPress={() => setOpen(true)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="Tag" size={18} color={theme.brandText} />
          <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
            Have a coupon?
          </ThemedText>
        </Tap>
      )}

      {pointsKnown ? (
        d.usable > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: Radius.md, backgroundColor: d.pointsOn ? theme.successSoft : theme.card, borderWidth: 1, borderColor: d.pointsOn ? theme.successBorder : theme.border }}>
            <Icon name="CheckCircle" size={20} color={theme.success} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallMedium">{t('Use {n} points: take off {amount}', { n: d.usable, amount: formatBDT(d.usableWorth) })}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted" literal>
                {t('{name} has {n} points', { name: customerName ?? '', n: d.balance })}
              </ThemedText>
            </View>
            <Switch accessibilityLabel={t('Use the points')} value={d.pointsOn} onValueChange={d.setPoints} trackColor={{ true: theme.brand }} thumbColor={d.pointsOn ? theme.onBrand : undefined} />
          </View>
        ) : d.balance > 0 ? (
          <Pill icon="CheckCircle" text={d.loyalty && d.balance < d.loyalty.minRedeemPoints ? t('{n} points. {min} are needed to spend them.', { n: d.balance, min: d.loyalty.minRedeemPoints }) : t('{n} points', { n: d.balance })} fg={theme.textSecondary} soft={theme.canvas} line={theme.border} />
        ) : null
      ) : null}

      {changed && d.totals ? (
        <View style={{ gap: 4, padding: 12, borderRadius: Radius.md, backgroundColor: theme.canvas }}>
          <Line label="Total" value={formatBDT(total)} />
          {d.coupon ? <Line label="Coupon" value={`−${formatBDT(d.coupon.discount)}`} tone="good" /> : null}
          {d.points > 0 ? <Line label="Points" value={`−${formatBDT(d.pointsWorth)}`} tone="good" /> : null}
          {compareMoney(d.totals.rounding, '0') !== 0 ? <Line label="Rounded to a whole taka" value={`${compareMoney(d.totals.rounding, '0') > 0 ? '+' : '−'}${formatBDT(d.totals.rounding.replace('-', ''))}`} /> : null}
          <Line label="To pay" value={formatBDT(d.totals.final)} strong />
        </View>
      ) : null}
    </View>
  );
}

function Line({ label, value, tone, strong }: { label: string; value: string; tone?: 'good'; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} themeColor={strong ? undefined : 'textSecondary'}>
        {label}
      </ThemedText>
      <ThemedText type={strong ? 'bodyMedium' : 'small'} literal style={{ color: tone === 'good' ? theme.success : theme.text, fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
    </View>
  );
}
