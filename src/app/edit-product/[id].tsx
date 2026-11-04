import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { listCategories } from '@/catalog/api';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { SkeletonRows } from '@/components/skeleton';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { getProduct, listBrands, updateProduct, type Product } from '@/products/api';
import { describeProductError, detailsBody, nameProblem, reorderProblem } from '@/products/logic';
import { showToast } from '@/ui/toast';

type Option = { id: string; name: string };

/** Change an item's name, kind, brand and the level at which you want to be told it is running low. Only what changed is sent. */
export default function EditProductScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const { me } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useQuery({ queryKey: ['products', 'one', id], queryFn: () => getProduct(id), enabled: !!id });
  const allowed = me?.permissions?.includes('product.update') ?? false;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.canvas }} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
      <Stack.Screen options={{ title: t('Edit item') }} />
      {product.isPending ? <SkeletonRows count={3} /> : null}
      {product.isError ? <ErrorState message={t('Could not load this item.')} onRetry={() => void product.refetch()} /> : null}
      {product.data && !allowed ? <Notice>You do not have permission to do that.</Notice> : null}
      {product.data && allowed ? <Form product={product.data} /> : null}
    </ScrollView>
  );
}

function Form({ product }: { product: Product }) {
  const { t } = usePrefs();
  const router = useRouter();
  const queryClient = useQueryClient();
  const before = { name: product.name, category: product.category, brand: product.brand ?? '', reorder: String(Number(product.reorder_level)) };
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState<Option | null>({ id: product.category, name: product.category_name });
  const [brand, setBrand] = useState<Option | null>(product.brand ? { id: product.brand, name: product.brand_name } : null);
  const [reorder, setReorder] = useState(String(Number(product.reorder_level)));
  const [errors, setErrors] = useState<{ name?: string; reorder?: string }>({});
  const save = useMutation({
    mutationFn: (body: Record<string, string>) => updateProduct(product.id, body),
    onSuccess: () => {
      haptics.success();
      showToast({ text: t('Item saved') });
      for (const k of ['products', 'stock', 'catalog', 'sell']) void queryClient.invalidateQueries({ queryKey: [k] });
      router.back();
    },
    onError: () => haptics.warning(),
  });
  function submit() {
    const e = { name: nameProblem(name) ?? undefined, reorder: reorderProblem(reorder) ?? undefined };
    setErrors(e);
    if (e.name || e.reorder) return;
    const body = detailsBody(before, { name, category: category?.id ?? before.category, brand: brand?.id ?? before.brand, reorder: reorder.trim() === '' ? '0' : reorder });
    if (Object.keys(body).length === 0) return router.back();
    save.mutate(body);
  }
  return (
    <>
      <Field label="Name" value={name} onChangeText={(v) => { setName(v); save.reset(); }} error={errors.name ? t(errors.name) : undefined} />
      <Picker label="Kind of item" value={category} onChange={setCategory} load={listCategories} queryKey="categories" />
      <Picker label="Brand" value={brand} onChange={setBrand} load={listBrands} queryKey="brands" />
      <Field label="Tell me when stock goes below" hint="Leave 0 if you do not need this." value={reorder} onChangeText={setReorder} keyboardType="decimal-pad" error={errors.reorder ? t(errors.reorder) : undefined} />
      {save.isError ? <Notice>{describeProductError(save.error)}</Notice> : null}
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Button title="Cancel" variant="secondary" disabled={save.isPending} onPress={() => router.back()} style={{ flex: 1 }} />
        <Button title="Save" variant="success" loading={save.isPending} onPress={submit} style={{ flex: 1 }} />
      </View>
    </>
  );
}
