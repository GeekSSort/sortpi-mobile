import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { createCustomer } from '@/customers/api';
import { buildCustomerRequest, validateNewCustomer, type CustomerErrors } from '@/customers/logic';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** Add a customer: name and phone, an optional credit limit, and whether they buy at wholesale prices. */
export default function AddCustomerScreen() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wholesale, setWholesale] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const form = { name, phone, wholesale, creditLimit };
    const found = validateNewCustomer(form);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await createCustomer(buildCustomerRequest(form));
      await qc.invalidateQueries({ queryKey: ['customers'] });
      showToast({ text: t('Customer added: {name}', { name: name.trim() }) });
      router.back();
    } catch (e) {
      setFailure(e instanceof ApiError && e.status === 403 ? 'You are not allowed to add customers.' : e instanceof ApiError && e.message ? e.message : 'Could not save the customer. Try again.');
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Customer name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              <Field label="Phone" required value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" error={errors.phone} />
              <Field label="Credit limit" prefix="৳" value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" placeholder="0.00" error={errors.creditLimit} hint="Leave empty to use the shop's default." />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="bodyMedium">Wholesale customer</ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    Sales to them use wholesale prices.
                  </ThemedText>
                </View>
                <Switch value={wholesale} onValueChange={setWholesale} trackColor={{ true: theme.brand }} />
              </View>
            </View>
            {failure ? <Notice>{failure}</Notice> : null}
            <Button title="Save customer" size="lg" loading={busy} onPress={() => void save()} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
