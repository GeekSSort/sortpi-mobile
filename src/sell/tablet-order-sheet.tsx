import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';

import { lineEstimate, type Cart, type CartLine } from './cart';
import { validTillQuantity } from './tablet-layout';

export function TabletOrderSheet({ cart, onQuantity, onRemove, onEditing }: {
  cart: Cart;
  onQuantity: (key: string, quantity: string) => void;
  onRemove: (key: string, name: string) => void;
  onEditing: (key: string, editing: boolean) => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8, minHeight: 44, backgroundColor: theme.canvas }}>
        <ThemedText type="smallMedium" style={{ flex: 2 }}>Product</ThemedText>
        <ThemedText type="smallMedium" style={{ width: 56, textAlign: 'center' }}>Qty</ThemedText>
        <ThemedText type="smallMedium" style={{ flex: 1, textAlign: 'right' }}>Price</ThemedText>
        <ThemedText type="smallMedium" style={{ flex: 1, textAlign: 'right' }}>Total</ThemedText>
        <View style={{ width: 44 }} />
      </View>
      {cart.length === 0 ? <ThemedText type="small" themeColor="textMuted" style={{ padding: 12 }}>Find a product to start the invoice.</ThemedText> : null}
      {cart.map((line, index) => (
        <View key={line.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 8, borderTopWidth: 1, borderColor: theme.border, backgroundColor: index % 2 === 0 ? theme.card : theme.canvas }}>
          <View style={{ flex: 2 }}>
            <ThemedText type="smallMedium" literal numberOfLines={2}>{line.name}{line.unitLabel ? ` (${line.unitLabel})` : ''}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted" literal numberOfLines={1}>{line.sku}</ThemedText>
          </View>
          <QuantityCell line={line} onChange={(value) => onQuantity(line.key, value)} onEditing={(editing) => onEditing(line.key, editing)} />
          <ThemedText type="small" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit>{formatBDT(line.unitPrice)}</ThemedText>
          <ThemedText type="smallMedium" style={{ flex: 1, textAlign: 'right' }} numberOfLines={1} adjustsFontSizeToFit>{formatBDT(lineEstimate(line))}</ThemedText>
          <Tap accessibilityRole="button" accessibilityLabel={t('Remove {name}', { name: line.name })} onPress={() => { onEditing(line.key, false); onRemove(line.key, line.name); }} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Trash2" size={18} color={theme.danger} />
          </Tap>
        </View>
      ))}
    </Card>
  );
}

function QuantityCell({ line, onChange, onEditing }: { line: CartLine; onChange: (value: string) => void; onEditing: (editing: boolean) => void }) {
  const theme = useTheme();
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && !validTillQuantity(draft, !!line.allowDecimal);
  return (
    <TextInput
      accessibilityLabel={t('Change the amount of {name}', { name: line.name })}
      value={draft ?? String(Number(line.quantity))}
      onFocus={() => onEditing(true)}
      onChangeText={setDraft}
      onEndEditing={({ nativeEvent }) => {
        const value = nativeEvent.text.trim();
        if (validTillQuantity(value, !!line.allowDecimal)) onChange(value);
        setDraft(null);
        onEditing(false);
      }}
      keyboardType={line.allowDecimal ? 'decimal-pad' : 'number-pad'}
      disableFullscreenUI
      selectTextOnFocus
      returnKeyType="done"
      style={{ width: 56, minHeight: 44, color: theme.text, borderWidth: 1, borderColor: invalid ? theme.danger : theme.border, borderRadius: 6, textAlign: 'center' }}
    />
  );
}
