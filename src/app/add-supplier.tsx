import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { createSupplier, supplierCodes } from '@/suppliers/api';
import { describeSupplierError, nextSupplierCode, supplierBody, validateNewSupplier, type SupplierErrors } from '@/suppliers/logic';
import { showToast } from '@/ui/toast';

/** Add a supplier: a name and a phone number. The code is made for you (SUP-021). */
export default function AddSupplierScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<SupplierErrors>({});

  const save = useMutation({
    mutationFn: async () => createSupplier(supplierBody({ name, phone, contact }, nextSupplierCode(await supplierCodes().catch(() => [])))),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Supplier added: {name}', { name: name.trim() }) });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      router.back();
    },
    onError: () => haptics.warning(),
  });

  function submit() {
    const found = validateNewSupplier({ name, phone, contact });
    setErrors(found);
    if (!Object.keys(found).length) save.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <Field label="Supplier name" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} autoFocus />
              <Field label="Phone" required value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" error={errors.phone} />
              <Field label="Contact person (optional)" value={contact} onChangeText={setContact} autoCapitalize="words" />
            </View>
            {save.isError ? <Notice>{describeSupplierError(save.error)}</Notice> : null}
            <Button title="Save supplier" size="lg" loading={save.isPending} onPress={submit} />
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
