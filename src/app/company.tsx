import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, Share, View } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PLATFORM_DOMAIN } from '@/auth/platform';
import { useSession } from '@/auth/session-provider';
import { shareMessage, shopNameOf } from '@/auth/workspace';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { Field } from '@/components/field';
import { Icon } from '@/components/icons/icon';
import { Notice } from '@/components/notice';
import { SkeletonRows } from '@/components/skeleton';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { haptics } from '@/lib/haptics';
import { getCompany, removeLogo, saveCompany, uploadLogo } from '@/settings/api';
import { describeSettingsError } from '@/settings/logic';
import { describeLogoError, logoProblem } from '@/settings/logo';
import { companyPatch, companyProblems, formOf, type Company, type CompanyForm } from '@/settings/shop-details';
import { showToast } from '@/ui/toast';

const KEY = ['settings', 'company'];

/** The shop's name, the name printed on bills, tax number, phone and address. Email, money and time zone are shown but changed on the computer. */
export default function ShopDetailsScreen() {
  const theme = useTheme();
  const { t } = usePrefs();
  const queryClient = useQueryClient();
  const { me, workspaceUrl } = useSession();
  const shopName = shopNameOf(workspaceUrl, PLATFORM_DOMAIN);
  const perms = me?.permissions ?? [];
  const canSee = perms.includes('settings.view');
  const canEdit = perms.includes('settings.update');
  const q = useQuery({ queryKey: KEY, queryFn: getCompany, enabled: canSee });
  const company = q.data ?? null;
  const [edits, setEdits] = useState<Partial<CompanyForm>>({});
  const [shown, setShown] = useState(false);
  const form: CompanyForm | null = company ? { ...formOf(company), ...edits } : null;
  const patch = company && form ? companyPatch(company, form) : {};
  const dirty = Object.keys(patch).length > 0;
  const problems = form ? companyProblems(form) : {};

  const save = useMutation({
    mutationFn: (v: { c: Company; patch: Record<string, string> }) => saveCompany(v.c.id, v.patch),
    onSuccess: (fresh) => {
      haptics.success();
      showToast({ text: t('Saved') });
      queryClient.setQueryData(KEY, fresh);
      setEdits({});
      setShown(false);
    },
    onError: () => haptics.warning(),
  });

  /** Going back with typed changes that were not saved asks first, so a tap on Back never throws them away. */
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(dirty && !leaving && !save.isPending, ({ repeat }) =>
    Alert.alert(t('Leave without saving?'), t('What you changed will be lost.'), [
      { text: t('Keep editing'), style: 'cancel' },
      { text: t('Leave'), style: 'destructive', onPress: () => { setLeaving(true); repeat(); } },
    ]),
  );

  if (!canSee) {
    return (
      <View style={{ flex: 1, padding: Spacing.three, backgroundColor: theme.canvas }}>
        <Notice>You are not allowed to see this. Ask the owner.</Notice>
      </View>
    );
  }
  const set = (k: keyof CompanyForm) => (v: string) => {
    setEdits((e) => ({ ...e, [k]: v }));
    save.reset();
  };
  function submit() {
    setShown(true);
    if (!company || Object.keys(problems).length || !dirty) return;
    save.mutate({ c: company, patch });
  }
  const err = (k: keyof CompanyForm) => (shown && problems[k] ? t(problems[k]) : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <Stack.Screen options={{ title: t('Shop details') }} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <KeyboardAwareScrollView bottomOffset={24} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />} contentContainerStyle={{ padding: Spacing.three, gap: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            {q.isError ? <ErrorState message={t('Could not load your shop details.')} onRetry={() => void q.refetch()} /> : null}
            {q.isPending && canSee ? <SkeletonRows /> : null}
            {form && company ? (
              <>
                <Notice kind="info">{canEdit ? 'These show on your bills and receipts.' : 'You can look at these, but only the owner can change them.'}</Notice>
                <LogoCard company={company} canEdit={canEdit} onDone={(fresh) => queryClient.setQueryData(KEY, fresh)} />
                <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <Field label="Shop name" required value={form.name} onChangeText={set('name')} editable={canEdit} autoCapitalize="words" error={err('name')} />
                  <Field label="Name on bills" hint="The full or legal name, if it is different." value={form.legal} onChangeText={set('legal')} editable={canEdit} autoCapitalize="words" error={err('legal')} />
                  <Field label="Phone" value={form.phone} onChangeText={set('phone')} editable={canEdit} keyboardType="phone-pad" placeholder="01XXXXXXXXX" error={err('phone')} />
                  <Field label="Tax number (TIN or BIN)" value={form.tax} onChangeText={set('tax')} editable={canEdit} autoCapitalize="characters" error={err('tax')} />
                  <Field label="Address" value={form.address} onChangeText={set('address')} editable={canEdit} multiline autoCapitalize="sentences" error={err('address')} />
                </View>
                {save.isError ? <Notice>{t(describeSettingsError(save.error))}</Notice> : null}
                {canEdit ? <Button title="Save" variant="success" size="lg" loading={save.isPending} disabled={!dirty} onPress={submit} /> : null}
                {shopName ? (
                  <View style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                    <Fixed label="Shop name to type in the app" value={shopName} />
                    <ThemedText type="caption" themeColor="textMuted">
                      Staff type this when they open SortPi for the first time.
                    </ThemedText>
                    <Button
                      title="Send it to my staff"
                      variant="secondary"
                      onPress={() => {
                        const m = shareMessage(shopName, PLATFORM_DOMAIN);
                        void Share.share({ message: t('Open the SortPi app and type this shop name: {name}\nWeb address: https://{host}', { name: m.name, host: m.host }) });
                      }}
                    />
                  </View>
                ) : null}
                <View style={{ padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
                  <Fixed label="Email" value={company.email} />
                  <Fixed label="Money" value={`${company.currency_symbol} ${company.currency_code}`} />
                  <Fixed label="Time zone" value={company.timezone} />
                  <ThemedText type="caption" themeColor="textMuted">
                    To change these, use the computer.
                  </ThemedText>
                </View>
              </>
            ) : null}
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Fixed({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three }}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallMedium" literal selectable style={{ flexShrink: 1, textAlign: 'right' }}>
        {value || '–'}
      </ThemedText>
    </View>
  );
}

/** The shop's logo: what it looks like now, pick a new one from the photos, or take it off. It saves at once, apart from the typed fields. */
function LogoCard({ company, canEdit, onDone }: { company: Company; canEdit: boolean; onDone: (fresh: Company) => void }) {
  const theme = useTheme();
  const { t } = usePrefs();
  const [note, setNote] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const done = (text: string) => (fresh: Company) => {
    haptics.success();
    showToast({ text: t(text) });
    setNote(null);
    onDone(fresh);
  };
  const upload = useMutation({ mutationFn: (p: ImagePicker.ImagePickerAsset) => uploadLogo(company.id, p.uri), onSuccess: done('Logo saved'), onError: (e) => { haptics.warning(); setNote(describeLogoError(e)); } });
  const remove = useMutation({ mutationFn: () => removeLogo(company.id), onSuccess: done('Logo removed'), onError: (e) => { haptics.warning(); setNote(describeLogoError(e)); } });
  const busy = upload.isPending || remove.isPending;
  const has = !!company.logo_url && broken !== company.logo_url;

  async function choose() {
    setNote(null);
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (r.canceled || !r.assets[0]) return;
    const problem = logoProblem(r.assets[0]);
    if (problem) return setNote(problem);
    upload.mutate(r.assets[0]);
  }
  function askRemove() {
    Alert.alert(t('Take off the logo?'), t('Your bills will show the shop name only.'), [{ text: t('Not now'), style: 'cancel' }, { text: t('Yes, take it off'), style: 'destructive', onPress: () => remove.mutate() }]);
  }
  return (
    <View style={{ padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <View style={{ width: 88, height: 88, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: theme.canvas, borderWidth: 1, borderColor: theme.border }}>
          {has ? <Image source={{ uri: company.logo_url }} contentFit="contain" accessibilityLabel={t('Your shop logo')} onError={() => setBroken(company.logo_url)} style={{ width: 88, height: 88 }} /> : <Icon name="Store" size={36} color={theme.textMuted} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="bodyMedium">Shop logo</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {company.logo_url ? (has ? 'Shown at the top of your bills.' : 'The logo is saved but could not be shown here.') : 'You have not added a logo yet.'}
          </ThemedText>
        </View>
      </View>
      {note ? <Notice>{t(note)}</Notice> : null}
      {canEdit ? (
        <View style={{ gap: Spacing.two }}>
          <Button title={company.logo_url ? 'Choose another logo' : 'Choose a logo'} variant="secondary" loading={upload.isPending} disabled={remove.isPending} onPress={() => void choose()} />
          {company.logo_url ? (
            <Tap accessibilityRole="button" onPress={askRemove} disabled={busy} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, backgroundColor: theme.dangerSoft, borderWidth: 1.5, borderColor: theme.dangerBorder }}>
              <Icon name="Trash2" size={20} color={theme.danger} />
              <ThemedText type="smallMedium" style={{ color: theme.danger }}>
                Take off the logo
              </ThemedText>
            </Tap>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
