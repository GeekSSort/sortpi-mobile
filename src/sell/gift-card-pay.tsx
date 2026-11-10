import { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { findGiftCard, type GiftCard } from '@/trade/api';

import { describeSellError } from './messages';

type Checked = { code: string; card: GiftCard | null; note: string | null };

/**
 * The gift card's code, and a button that asks the server what is left on it. The code goes in the payment's reference when the sale is
 * confirmed; the server spends the card then. Reading a card needs `sale.view`: a role without it is told the check happens at Confirm.
 */
export function GiftCardPay({ code, onCode, onBalance }: { code: string; onCode: (c: string) => void; onBalance: (balance: string | null) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);
  const typed = code.trim();
  const shown = checked && checked.code === typed ? checked : null; // a changed code forgets the old answer

  async function check() {
    if (!typed) return;
    setBusy(true);
    try {
      const card = await findGiftCard(typed);
      setChecked({ code: typed, card, note: null });
      onBalance(card.is_active ? card.balance : '0');
    } catch (e) {
      const forbidden = e instanceof ApiError && e.status === 403;
      setChecked({ code: typed, card: null, note: forbidden ? 'Your role cannot look cards up. The code is checked when you confirm.' : describeSellError(e) });
      onBalance(null);
    } finally {
      setBusy(false);
    }
  }

  const card = shown?.card;
  return (
    <View style={{ gap: 8 }}>
      <Field
        label="Gift card code"
        value={code}
        onChangeText={(v) => {
          onCode(v);
          onBalance(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Type the card's code"
        required
      />
      <Button title="Check what is left on the card" variant="secondary" loading={busy} disabled={!typed} onPress={() => void check()} />
      {card ? (
        <ThemedText type="smallMedium" style={{ color: card.is_active ? theme.success : theme.danger }} literal>
          {card.is_active ? t('{amount} left on the card.', { amount: formatBDT(card.balance, { dp: 2 }) }) : t('That gift card was voided.')}
        </ThemedText>
      ) : null}
      {shown?.note ? (
        <ThemedText type="small" themeColor="textMuted">
          {shown.note}
        </ThemedText>
      ) : null}
    </View>
  );
}
