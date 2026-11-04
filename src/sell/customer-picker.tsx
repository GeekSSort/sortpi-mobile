import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatBDT } from '@/lib/money';
import { amountDue } from '@/customers/logic';

import { searchCustomers, type PickedCustomer } from './customers';

/** Search and pick the customer for this sale. Leaving it empty means a walk-in. */
export function CustomerPicker({ onPick, onClose, allowWalkIn = true }: { onPick: (c: PickedCustomer | null) => void; onClose: () => void; allowWalkIn?: boolean }) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(text), 250); // the web waits 250 ms before searching, too
    return () => clearTimeout(t);
  }, [text]);
  const results = useQuery({ queryKey: ['till-customers', search.trim()], queryFn: () => searchCustomers(search), staleTime: 30_000 });

  return (
    <View>
      <View style={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.two }}>
        <Field label="Find a customer" value={text} onChangeText={setText} placeholder="Name or phone" autoCapitalize="none" autoCorrect={false} />
      </View>
      {allowWalkIn ? <Row title="Walk-in customer" sub="No account. Pays in full." onPress={() => { onPick(null); onClose(); }} /> : null}
      {results.isPending ? <ActivityIndicator color={theme.brand} style={{ margin: Spacing.three }} /> : null}
      {results.isError ? (
        <ThemedText type="small" style={{ color: theme.danger, paddingHorizontal: Spacing.three }}>
          Could not load customers.
        </ThemedText>
      ) : null}
      {results.data?.map((c) => {
        const due = amountDue(c.balance);
        return <Row key={c.id} typed title={c.name} sub={`${c.phone}${c.wholesale ? ' · Wholesale' : ''}${due !== '0.00' ? ` · owes ${formatBDT(due)}` : ''}`} onPress={() => { onPick(c); onClose(); }} />;
      })}
      {results.data?.length === 0 ? (
        <ThemedText type="small" themeColor="textMuted" style={{ paddingHorizontal: Spacing.three }}>
          Nobody matches that.
        </ThemedText>
      ) : null}
    </View>
  );
}

function Row({ title, sub, onPress, typed }: { title: string; sub: string; onPress: () => void; typed?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} android_ripple={{ color: theme.backgroundSelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="bodyMedium" literal={typed}>{title}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {sub}
        </ThemedText>
      </View>
      <Icon name="ChevronRight" size={18} color={theme.textMuted} />
    </Pressable>
  );
}
