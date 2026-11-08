import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { BottomSheet } from '@/components/bottom-sheet';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/prefs';

import { PAPERS, type ReceiptWidth } from './paper';
import { usePaperPref } from './paper-pref';
import { printReceipt } from './print';

/**
 * Which paper is in the printer, drawn to scale: a 58 mm roll, an 80 mm roll and an A4 sheet side by side at their real
 * proportions, so a shopkeeper picks the shape they know instead of reading a size.
 *
 * The paper is chosen once: the first pick is remembered, and from then on Print goes straight to the print screen. More -> Receipt paper
 * changes it, or sets "Ask" to be asked every time. (A phone screen is narrower than an 80 mm roll, so the papers are drawn in proportion
 * to each other, not life size.)
 */
export function PaperSheet({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const t = useT();
  const { me } = useSession();
  const { width: screen } = useWindowDimensions();
  const [pref, savePref] = usePaperPref();
  const who = { shopName: me?.organization?.name ?? 'SortPi', branchName: me?.active_branch?.name };
  const last: ReceiptWidth = pref && pref !== 'ask' ? pref : '80mm';
  // A paper already chosen: print at once and never show the sheet.
  const direct = pref && pref !== 'ask' ? pref : null;
  useEffect(() => {
    if (saleId && direct) {
      void printReceipt(saleId, direct, who);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId, direct]);
  const gap = 12;
  const totalMm = PAPERS.reduce((n, p) => n + p.mm[0], 0);
  const perMm = (screen - 32 - gap * (PAPERS.length - 1)) / totalMm; // sheet gutters 16 each side

  function pick(w: ReceiptWidth) {
    const id = saleId;
    if (pref === null) void savePref(w); // the first pick becomes the paper for every print after it
    onClose();
    if (id) void printReceipt(id, w, who);
  }

  return (
    <BottomSheet visible={saleId !== null && pref !== undefined && !direct} onClose={onClose} title="Print receipt">
      <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 8 }}>
        <ThemedText type="body" themeColor="textSecondary">
          Which paper is in the printer?
        </ThemedText>
        {pref === null ? (
          <ThemedText type="caption" themeColor="textMuted">
            Only asked this once. You can change it later in More.
          </ThemedText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap }}>
          {PAPERS.map((p) => {
            const on = p.width === last;
            const w = p.mm[0] * perMm;
            return (
              <Tap key={p.width} accessibilityRole="button" accessibilityLabel={`${t(p.label)}, ${p.width === 'a4' ? '210 × 297 mm' : p.width.replace('mm', ' mm')}`} accessibilityState={{ selected: on }} onPress={() => pick(p.width)} style={{ width: w, alignItems: 'center', gap: 6 }}>
                <View style={{ width: w, height: p.mm[1] * perMm, borderRadius: Radius.sm, borderWidth: 2, borderColor: on ? theme.go : theme.inputBorder, backgroundColor: on ? theme.successSoft : theme.card, padding: 6, gap: 4 }}>
                  {[0.7, 1, 1, 0.55, 1, 0.8].map((f, i) => (
                    <View key={i} style={{ height: 3, width: `${f * 100}%`, borderRadius: 2, backgroundColor: theme.border }} />
                  ))}
                </View>
                <ThemedText type="smallMedium" style={{ textAlign: 'center' }}>
                  {p.label}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted" literal style={{ textAlign: 'center' }}>
                  {p.width === 'a4' ? '210 × 297 mm' : p.width.replace('mm', ' mm')}
                </ThemedText>
              </Tap>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}
