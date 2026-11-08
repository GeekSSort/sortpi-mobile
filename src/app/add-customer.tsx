import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { SkeletonRows } from '@/components/skeleton';
import { createCustomer, getCustomer, updateCustomer, type CustomerRow } from '@/customers/api';
import { buildCustomerPatch, buildCustomerRequest, validateNewCustomer, type CustomerErrors } from '@/customers/logic';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';
import { showToast } from '@/ui/toast';

/** Add a customer, or edit one (`?id=`): name and phone, an optional credit limit, and whether they buy at wholesale prices. */
export default function AddCustomerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const one = useQuery({ queryKey: ['customers', 'one', id], queryFn: () => getCustomer(id as string), enabled: !!id });
  if (id && !one.data) return <View style={{ flex: 1 }}>{one.isPending ? <SkeletonRows count={3} /> : null}</View>;
  return <CustomerForm customer={one.data} />;
}

function CustomerForm({ customer }: { customer?: CustomerRow }) {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [wholesale, setWholesale] = useState(customer?.customer_type === 'WHOLESALE');
  const [creditLimit, setCreditLimit] = useState(customer && Number(customer.credit_limit) > 0 ? String(Number(customer.credit_limit)) : '');
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
      if (customer) await updateCustomer(customer.id, buildCustomerPatch(form));
      else await createCustomer(buildCustomerRequest(form));
      await qc.invalidateQueries({ queryKey: ['customers'] });
      showToast({ text: customer ? t('Saved: {name}', { name: name.trim() }) : t('Customer added: {name}', { name: name.trim() }) });
      router.back();
    } catch (e) {
      setFailure(e instanceof ApiError && e.status === 403 ? customer ? 'You are not allowed to change customers.' : 'You are not allowed to add customers.' : e instanceof ApiError && e.message ? e.message : 'Could not save the customer. Try again.');
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: customer ? t('Edit Customer') : t('Add Customer') }} />
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
