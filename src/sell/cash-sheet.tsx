import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { newIdempotencyKey } from '@/api/idempotency';
import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

import { cashOptions, recordCashMovement } from './api';
import { describeSellError } from './messages';

/** What each kind of cash movement needs besides the amount and a reason. */
export const CASH_KINDS = [
  { id: 'SHOP_EXPENSE', label: 'Shop expense', way: 'OUT', needs: 'category' },
  { id: 'SUPPLIER_BILL', label: 'Supplier bill', way: 'OUT', needs: 'supplier' },
  { id: 'TO_BANK', label: 'To safe or bank', way: 'OUT', needs: 'account' },
  { id: 'OWNER_OUT', label: 'Owner took', way: 'OUT', needs: 'person' },
  { id: 'STAFF_ADVANCE', label: 'Staff advance', way: 'OUT', needs: 'person' },
  { id: 'FROM_BANK', label: 'From safe or bank', way: 'IN', needs: 'account' },
  { id: 'OWNER_IN', label: 'Owner put in', way: 'IN', needs: 'person' },
] as const;

/** "Cash in/out": money paid out of the drawer, or put into it, written into the open shift. */
export function CashSheet({ visible, shiftId, onClose, onDone }: { visible: boolean; shiftId: string | undefined; onClose: () => void; onDone: () => void }) {
  const theme = useTheme();
  const t = useT();
  const options = useQuery({ queryKey: ['cash-options'], queryFn: cashOptions, enabled: visible, staleTime: 60_000, retry: false });
  const [kind, setKind] = useState<(typeof CASH_KINDS)[number]['id']>('SHOP_EXPENSE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [person, setPerson] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const spec = CASH_KINDS.find((k) => k.id === kind)!;
  const pickList = spec.needs === 'category' ? options.data?.categories : spec.needs === 'supplier' ? options.data?.suppliers : spec.needs === 'account' ? options.data?.accounts : undefined;
  const chip = (on: boolean, label: string, press: () => void, key: string) => (
    <Tap key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={press} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: on ? theme.brand : theme.border, backgroundColor: on ? theme.brandSoft : theme.card }}>
      <ThemedText type="smallMedium" literal={key.startsWith('p:')} style={{ color: on ? theme.brandText : theme.textSecondary }}>{key.startsWith('p:') ? label : t(label)}</ThemedText>
    </Tap>
  );
  async function save() {
    if (!shiftId) return setProblem('Open the till first.');
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) return setProblem('Type the amount, like 500 or 500.50.');
    if (!reason.trim()) return setProblem('Say what it is for.');
    if (spec.needs === 'person' && !person.trim()) return setProblem("Type the person's name.");
    if (spec.needs && spec.needs !== 'person' && !partyId) return setProblem(spec.needs === 'category' ? 'Choose the kind of expense.' : spec.needs === 'supplier' ? 'Choose the supplier.' : 'Choose a safe or bank account.');
    setBusy(true);
    setProblem(null);
    try {
      await recordCashMovement(shiftId, { kind, amount: amount.trim(), reason: reason.trim(), ...(spec.needs === 'person' ? { party_name: person.trim() } : spec.needs === 'category' ? { category_id: partyId! } : spec.needs === 'supplier' ? { supplier_id: partyId! } : spec.needs === 'account' ? { account_id: partyId! } : {}) }, newIdempotencyKey());
      setAmount('');
      setReason('');
      setPartyId(null);
      setPerson('');
      onDone();
    } catch (e) {
      setProblem(describeSellError(e));
    } finally {
      setBusy(false);
    }
  }
  const group = (way: 'OUT' | 'IN', title: string) => (
    <View style={{ gap: 6 }}>
      <ThemedText type="smallMedium" themeColor="textSecondary">{t(title)}</ThemedText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {CASH_KINDS.filter((k) => k.way === way).map((k) => chip(kind === k.id, k.label, () => { setKind(k.id); setPartyId(null); setProblem(null); }, k.id))}
      </View>
    </View>
  );
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cash in/out">
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        {group('OUT', 'Money out of the drawer')}
        {group('IN', 'Money into the drawer')}
        {pickList ? (
          <View style={{ gap: 6 }}>
            <ThemedText type="smallMedium" themeColor="textSecondary">{t(spec.needs === 'category' ? 'Kind of expense' : spec.needs === 'supplier' ? 'Supplier' : 'Which one')}</ThemedText>
            {options.isPending ? <ThemedText type="small" themeColor="textMuted">{t('Loading…')}</ThemedText> : null}
            {pickList.length === 0 && !options.isPending ? <ThemedText type="small" themeColor="textMuted">{t('Nothing to choose from. Add one on the computer first.')}</ThemedText> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{pickList.map((p) => chip(partyId === p.id, p.name, () => setPartyId(p.id), `p:${p.id}`))}</View>
          </View>
        ) : null}
        {spec.needs === 'person' ? <Field label="Person's name" value={person} onChangeText={(v) => { setPerson(v); setProblem(null); }} /> : null}
        <Field label="Amount" value={amount} onChangeText={(v) => { setAmount(v); setProblem(null); }} keyboardType="decimal-pad" prefix="৳" />
        <Field label="What is it for?" value={reason} onChangeText={(v) => { setReason(v); setProblem(null); }} />
        {options.isError ? <ThemedText type="small" style={{ color: theme.danger }}>{t('You may not record cash in or out, or it could not be loaded.')}</ThemedText> : null}
        {problem ? <ThemedText type="small" style={{ color: theme.danger }}>{t(problem)}</ThemedText> : null}
        <Button title="Save" variant="success" loading={busy} disabled={options.isError} onPress={() => void save()} />
      </View>
    </BottomSheet>
  );
}
