import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Pressable, Switch, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { FormColumns } from '@/components/form-columns';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { Picker } from '@/components/picker';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createProduct, listCategories, listUnits, postOpeningStock, uploadProductImage, type Photo } from '@/catalog/api';
import { newIdempotencyKey } from '@/api/idempotency';
import { listBrands } from '@/products/api';
import { findWarehouseId } from '@/sell/api';
import { getLastChoice, setLastChoice } from '@/catalog/last-choice';
import { buildProductRequest, describeProductError, openingStockBody, profitNote, validateNewProduct, type FormErrors, type VariantRow } from '@/catalog/new-product';
import { lookupBarcode } from '@/sell/api';
import { setPendingItem } from '@/sell/pending';
import { formatBDT } from '@/lib/money';
import { useSession } from '@/auth/session-provider';
import { Scanner } from '@/scan/scanner';
import { useUsesBarcodes } from '@/sell/use-barcodes';
import { showToast } from '@/ui/toast';
import { track } from '@/lib/analytics';
import { useT } from '@/i18n/prefs';

type Option = { id: string; name: string };

/**
 * Add a product, usually from a code the till did not know. The groups follow the web's New Items form
 * (Basics, Classification, Pricing). Opened from Sell it hands the new item back to the cart.
 */
export default function AddProductScreen() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const { me } = useSession();
  const qc = useQueryClient();
  const { code, from } = useLocalSearchParams<{ code?: string; from?: string }>();
  const [barcode, setBarcode] = useState(code ?? '');
  const [editingCode, setEditingCode] = useState(!code);
  const [scanning, setScanning] = useState(false);
  // A shop without barcodes never sees the code card, unless a code came in (a scan from the till).
  const showCode = useUsesBarcodes() || !!code;
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Option | null>(getLastChoice().category);
  const [unit, setUnit] = useState<Option | null>(getLastChoice().unit);
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [brand, setBrand] = useState<Option | null>(null);
  const [genericName, setGenericName] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [sizesOn, setSizesOn] = useState(false);
  const [sizes, setSizes] = useState<VariantRow[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);

  const canCreate = me?.permissions?.includes('product.create') ?? false;
  // Costs are the shop's secret: only people who may see them are asked for one.
  const canMakeCategory = me?.permissions?.includes('category.create') ?? false;
  const canMakeUnit = me?.permissions?.includes('unit.create') ?? false;
  const canSeeCost = me?.permissions?.includes('product.view_cost') ?? false;
  const note = canSeeCost && !sizesOn ? profitNote(costPrice, price) : null;
  const canCount = canSeeCost && (me?.permissions?.includes('inventory.adjust') ?? false);
  const hasGeneric = ((me?.organization as { category?: { features?: string[] } } | undefined)?.category?.features ?? []).includes('generic');
  const emptySize = (): VariantRow => ({ name: '', price: '', cost: '', opening: '' });
  const setSize = (i: number, patch: Partial<VariantRow>) => setSizes((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  async function pick(camera: boolean) {
    const ask = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!ask.granted) return;
    const r = camera ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    const a = r.canceled ? null : r.assets[0];
    if (a) setPhoto({ uri: a.uri, name: a.fileName || `item-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
  }

  // Most shelves sell by the piece, so start there. A unit carried over from the last product wins.
  const units = useQuery({ queryKey: ['units', 'default'], queryFn: () => listUnits(), staleTime: 5 * 60_000 });
  if (!unit && units.data) {
    const piece = units.data.find((u) => /^(piece|pcs?)\b/i.test(u.name));
    if (piece) setUnit(piece); // chosen while rendering, once the list is here
  }

  async function save() {
    const form = { barcode, name, categoryId: category?.id ?? '', unitId: unit?.id ?? '', price, sku, costPrice: canSeeCost ? costPrice : '', wholesalePrice, mrp, reorderLevel, brandId: brand?.id, genericName: hasGeneric ? genericName : '', openingStock: canCount && !sizesOn ? openingStock : '', variants: sizesOn ? sizes.map((r) => ({ ...r, cost: canSeeCost ? r.cost : '', opening: canCount ? r.opening : '' })) : [] };
    const found = validateNewProduct(form);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const made = await createProduct(buildProductRequest(form));
      // The item is saved. Stock and the photo are extras: if one fails the item stays and the person is told what to do.
      const missed: string[] = [];
      try {
        const wh = form.openingStock?.trim() || form.variants.some((v) => v.opening.trim()) ? await findWarehouseId(me?.active_branch?.id ?? '') : null;
        const stock = wh ? openingStockBody(form, made.variants ?? [], wh) : null;
        if (stock) await postOpeningStock(stock, newIdempotencyKey());
      } catch {
        missed.push(t('The stock could not be counted in. Do it from Count your stock.'));
      }
      if (photo) {
        try {
          await uploadProductImage(made.id, photo);
        } catch {
          missed.push(t('The photo could not be added. Open the item to try again.'));
        }
      }
      if (missed.length) showToast({ text: missed.join(' ') });
      void qc.invalidateQueries({ queryKey: ['stock'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
      setLastChoice({ category, unit });
      track('item_added', { source: from === 'sell' ? 'sell' : 'stock' });
      showToast({ text: t('Saved: {name}', { name: name.trim() }) });
      if (from === 'sell' && barcode.trim() && me?.active_branch?.id) {
        // Straight into the cart: look it up the normal way so the price and unit come from the server.
        const item = await lookupBarcode(barcode, me.active_branch.id).catch(() => null);
        setPendingItem(item);
      }
      router.back();
    } catch (e) {
      setFailure(describeProductError(e));
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three }} keyboardShouldPersistTaps="handled">
            {!canCreate ? <Notice>You are not allowed to add products. Ask your manager to add it.</Notice> : null}

            <FormColumns primary={<>
            {/* The scanned code, shown as what it is rather than as a text box. */}
            {showCode ? (
            <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.brandSoftBorder, backgroundColor: theme.brandSoft }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <View style={{ width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card }}>
                  <Icon name="ScanLine" size={22} color={theme.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="caption" style={{ color: theme.brandText }}>
                    Code on the packet
                  </ThemedText>
                  <ThemedText type="lead" numberOfLines={1} style={{ fontFamily: Fonts?.mono, color: barcode.trim() ? theme.text : theme.textMuted }}>
                    {barcode.trim() || 'No code yet'}
                  </ThemedText>
                </View>
                {!editingCode ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('Change the code')} onPress={() => setEditingCode(true)} style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemedText type="smallMedium" style={{ color: theme.brandText }}>
                      Change
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {editingCode ? (
                <View style={{ gap: Spacing.two }}>
                  {scanning ? <Scanner height={180} onCode={(c) => { setBarcode(c); setScanning(false); }} /> : null}
                  <Field label="Type or paste the code" value={barcode} onChangeText={setBarcode} autoCapitalize="none" autoCorrect={false} keyboardType="number-pad" error={errors.barcode} hint="Leave it empty to add the code later." />
                  <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                    <Button title={scanning ? 'Stop camera' : 'Scan with camera'} variant="secondary" onPress={() => setScanning((s) => !s)} style={{ flex: 1 }} />
                    {barcode.trim() ? <Button title="Done" onPress={() => { setScanning(false); setEditingCode(false); }} style={{ minWidth: 88 }} /> : null}
                  </View>
                </View>
              ) : null}
            </View>
            ) : null}

            <Section title="The item" hint="Just the name and the price are enough to start selling.">
              <Field label="Name of the item" required value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} placeholder="For example: Rice 1 kg" />
 {sizesOn ? null : <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {canSeeCost ? (
                  <View style={{ flex: 1 }}>
                    <Field label="You buy at" prefix="৳" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" error={errors.costPrice} placeholder="0" />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Field label="You sell at" prefix="৳" value={price} onChangeText={setPrice} keyboardType="decimal-pad" error={errors.price} placeholder="0" />
                </View>
              </View>}
              {canCount && !sizesOn ? <Field label="How many are on the shelf now" value={openingStock} onChangeText={setOpeningStock} keyboardType="decimal-pad" error={errors.openingStock} placeholder="0" hint="They are counted in as stock you bought, at the price you pay." /> : null}
              {note ? (
                <ThemedText type="smallMedium" style={{ color: note.loss ? theme.danger : theme.success }}>
                  {note.loss ? t('You lose {amount} on each one.', { amount: formatBDT(note.profit.replace('-', '')) }) : t('You earn {amount} on each one ({percent}%).', { amount: formatBDT(note.profit), percent: note.percent })}
                </ThemedText>
              ) : null}
            </Section>

            <Section title="Sizes or colours" hint="Switch on if it comes in more than one, each with its own price and stock.">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                <ThemedText type="bodyMedium" style={{ flex: 1 }}>
                  It comes in sizes or colours
                </ThemedText>
                <Switch value={sizesOn} onValueChange={(v) => { setSizesOn(v); if (v && sizes.length === 0) setSizes([emptySize(), emptySize()]); }} trackColor={{ true: theme.brand }} />
              </View>
              {sizesOn ? (
                <>
                  {sizes.map((r, i) => (
                    <View key={i} style={{ gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: theme.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two }}>
                        <View style={{ flex: 1 }}>
                          <Field label={`${t('Size or colour')} ${i + 1}`} value={r.name} onChangeText={(v) => setSize(i, { name: v })} autoCapitalize="words" placeholder="Small, Red, 500 ml" />
                        </View>
                        {sizes.length > 2 ? (
                          <Pressable accessibilityRole="button" accessibilityLabel={t('Remove')} onPress={() => setSizes((rs) => rs.filter((_, k) => k !== i))} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="Trash2" size={20} color={theme.danger} />
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                        {canSeeCost ? (
                          <View style={{ flex: 1 }}>
                            <Field label="You buy at" prefix="৳" value={r.cost} onChangeText={(v) => setSize(i, { cost: v })} keyboardType="decimal-pad" placeholder="0" />
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Field label="You sell at" prefix="৳" value={r.price} onChangeText={(v) => setSize(i, { price: v })} keyboardType="decimal-pad" placeholder="0" />
                        </View>
                        {canCount ? (
                          <View style={{ flex: 1 }}>
                            <Field label="On the shelf" value={r.opening} onChangeText={(v) => setSize(i, { opening: v })} keyboardType="decimal-pad" placeholder="0" />
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}
                  {errors.variants ? <Notice>{errors.variants}</Notice> : null}
                  <Button title="Add another size or colour" variant="secondary" onPress={() => setSizes((rs) => [...rs, emptySize()])} />
                </>
              ) : null}
            </Section>

            </>} secondary={<>
            <Section title="What kind of item?" hint="So you can find it later. The next item remembers your choice.">
              <Picker label="Kind of item" required value={category} onChange={setCategory} load={listCategories} queryKey="categories" error={errors.categoryId} create={canMakeCategory ? 'category' : undefined} />
              <Picker label="Sold by" required value={unit} onChange={setUnit} load={listUnits} queryKey="units" error={errors.unitId} create={canMakeUnit ? 'unit' : undefined} />
              <Picker label="Brand" value={brand} onChange={setBrand} load={listBrands} queryKey="brands" />
            </Section>

            <Section title="Photo" hint="Optional. It shows on the item in the till and the lists.">
              {photo ? (
                <View style={{ alignItems: 'center', gap: Spacing.two }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 160, height: 160, borderRadius: Radius.md }} contentFit="cover" />
                  <Button title="Remove the photo" variant="secondary" onPress={() => setPhoto(null)} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <Button title="Take a photo" variant="secondary" onPress={() => void pick(true)} style={{ flex: 1 }} />
                  <Button title="From the gallery" variant="secondary" onPress={() => void pick(false)} style={{ flex: 1 }} />
                </View>
              )}
            </Section>

            <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore((m) => !m)} android_ripple={{ color: theme.backgroundSelected }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
              <ThemedText type="bodyMedium">{more ? 'Fewer details' : 'More details (optional)'}</ThemedText>
              <Icon name={more ? 'ChevronDown' : 'ChevronRight'} size={20} color={theme.textMuted} />
            </Pressable>

            {more ? (
              <Section title="More details" hint="Skip these if you are not sure. You can add them later.">
                <Field label="Item code (SKU)" value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} hint="Leave empty and SortPi makes one." />
                <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Wholesale price" prefix="৳" value={wholesalePrice} onChangeText={setWholesalePrice} keyboardType="decimal-pad" error={errors.wholesalePrice} placeholder="0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Printed price (MRP)" prefix="৳" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" error={errors.mrp} placeholder="0" />
                  </View>
                </View>
                {hasGeneric ? <Field label="What is in it (generic name)" value={genericName} onChangeText={setGenericName} autoCapitalize="words" placeholder="Paracetamol 500 mg" /> : null}
                <Field label="Tell me when only this many are left" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="decimal-pad" error={errors.reorderLevel} placeholder="0" />
              </Section>
            ) : null}

            </>} />
            {failure ? <Notice>{failure}</Notice> : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

        <View style={{ padding: Spacing.three, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card }}>
          <Button title="Save this item" variant="success" size="lg" loading={busy} disabled={!canCreate} onPress={() => void save()} trailing={<Icon name="Check" size={20} color={theme.onBrand} />} />
        </View>
      </SafeAreaView>
    </View>
  );
}

/** A titled group of fields, as the web form groups them. */
function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <ThemedText type="bodyMedium">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      </View>
      <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }}>{children}</View>
    </View>
  );
}
