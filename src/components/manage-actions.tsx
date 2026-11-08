import { Alert, View } from 'react-native';

import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { Spacing } from '@/constants/theme';
import { useT } from '@/i18n/prefs';

/**
 * Edit, Delete and Switch on for a record, the same on every detail screen. The server never erases a customer or supplier:
 * Delete switches the record off (it stays on record and in the lists as Inactive), so the screen says so and offers to switch it back on.
 * Each button shows only when the person holds the permission for it.
 */
export function ManageActions({ noun, active, canEdit, canDelete, busy, message, onEdit, onDelete, onActivate }: { noun: string; active: boolean; message?: string; canEdit: boolean; canDelete: boolean; busy?: boolean; onEdit: () => void; onDelete: () => void; onActivate: () => void }) {
  const t = useT();
  function confirm() {
    Alert.alert(t('Delete this {noun}?', { noun: t(noun) }), message ? t(message) : t('It is switched off and shown as Inactive. Its past sales and payments stay on record, and you can switch it on again.'), [
      { text: t('Keep it'), style: 'cancel' },
      { text: t('Yes, delete'), style: 'destructive', onPress: onDelete },
    ]);
  }
  return (
    <View style={{ gap: Spacing.two }}>
      {!active ? <Notice kind="info">{`This ${noun} is switched off (Inactive).`}</Notice> : null}
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {canEdit ? <Button title="Edit" variant="secondary" onPress={onEdit} style={{ flex: 1 }} /> : null}
        {active && canDelete ? <Button title="Delete" variant="secondary" loading={busy} onPress={confirm} style={{ flex: 1 }} /> : null}
        {!active && canEdit ? <Button title="Switch on" loading={busy} onPress={onActivate} style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}
