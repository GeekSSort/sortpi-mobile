import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { addMoney, compareMoney, formatBDT, subMoney } from '@/lib/money';

import type { PaymentInput } from './cart';
import { buildSplitPayments, type SplitRow } from './payment';

const WAYS: { id: SplitRow['method']; label: string }[] = [{ id: 'CASH', label: 'Cash' }, { id: 'CARD', label: 'Card' }, { id: 'MOBILE', label: 'Mobile' }, { id: 'BANK', label: 'Bank' }];
const blank = (method: SplitRow['method']): SplitRow => ({ method, amount: '', reference: '' });

/** "Multiple payment": the bill paid in more than one way. Each part has a way, an amount and, for a card or wallet, a reference. */
export function SplitPaySheet({ visible, total, hasCustomer, onClose, onUse }: {
  visible: boolean; total: string; hasCustomer: boolean; onClose: () => void; onUse: (plan: { payments: PaymentInput[]; due: string; rows: SplitRow[] }) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [rows, setRows] = useState<SplitRow[]>([blank('CASH'), blank('MOBILE')]);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (i: number, patch: Partial<SplitRow>) => { setRows((all) => all.map((r, n) => (n === i ? { ...r, ...patch } : r))); setProblem(null); };
  const typed = rows.reduce((n, r) => (/^\d+(\.\d{1,2})?$/.test(r.amount.trim()) ? addMoney(n, r.amount.trim()) : n), '0');
  const left = subMoney(total, typed);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Multiple payment">
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <ThemedText type="smallMedium">{t('Total')}: {formatBDT(total)}</ThemedText>
          <ThemedText type="smallMedium" style={{ color: compareMoney(left, '0') < 0 ? theme.danger : theme.textSecondary }}>{t('Left to pay')}: {formatBDT(left)}</ThemedText>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={{ gap: 8, padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: Radius.md }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {WAYS.map((w) => (
                <Tap key={w.id} accessibilityRole="button" accessibilityState={{ selected: r.method === w.id }} onPress={() => set(i, { method: w.id })} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: r.method === w.id ? theme.brand : theme.border, backgroundColor: r.method === w.id ? theme.brandSoft : theme.card }}>
                  <ThemedText type="smallMedium" style={{ color: r.method === w.id ? theme.brandText : theme.textSecondary }}>{t(w.label)}</ThemedText>
                </Tap>
              ))}
            </View>
            <Field label="Amount" value={r.amount} onChangeText={(v) => set(i, { amount: v })} keyboardType="decimal-pad" prefix="৳" />
            {r.method !== 'CASH' ? <Field label="Transaction ID (optional)" value={r.reference} onChangeText={(v) => set(i, { reference: v })} autoCapitalize="characters" /> : null}
          </View>
        ))}
        {rows.length < 4 ? <Button title="Add another way" variant="secondary" onPress={() => setRows((all) => [...all, blank('CARD')])} /> : null}
        {problem ? <ThemedText type="small" style={{ color: theme.danger }}>{t(problem)}</ThemedText> : null}
        <Button title="Use this split" variant="success" onPress={() => {
          const plan = buildSplitPayments(rows, total, hasCustomer);
          if (plan.problem) return setProblem(plan.problem);
          onUse({ payments: plan.payments, due: plan.due, rows });
        }} />
      </View>
    </BottomSheet>
  );
}
