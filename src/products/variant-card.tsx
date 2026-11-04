import { View } from 'react-native';

import { profitNote } from '@/catalog/new-product';
import { Icon, type IconName } from '@/components/icons/icon';
import { Tap } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { MONTHS } from '@/home/week';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import { formatBDT } from '@/lib/money';
import { formatQuantity, stockLevel, type StockLevel } from '@/stock/status';

import type { Product, Variant } from './api';
import { priceAfterOffer, type Offer } from './logic';

/** One colour per stock level, with its picture and word: green fine, orange running low, red finished or below zero. */
export function useLevelStyle() {
  const theme = useTheme();
  const { t } = usePrefs();
  return (level: StockLevel): { fg: string; soft: string; line: string; icon: IconName; word: string } => {
    if (level === 'in') return { fg: theme.success, soft: theme.successSoft, line: theme.successBorder, icon: 'CheckCircle', word: t('In stock') };
    if (level === 'low') return { fg: theme.warning, soft: theme.warningSoft, line: `${theme.warning}55`, icon: 'TriangleAlert', word: t('Running low') };
    return { fg: theme.danger, soft: theme.dangerSoft, line: theme.dangerBorder, icon: 'Cancel', word: level === 'negative' ? t('Negative stock') : t('Finished') };
  };
}

/** A small rounded label: a picture, then words, in one colour on its soft background. */
export function Pill({ icon, text, fg, soft, line }: { icon: IconName; text: string; fg: string; soft: string; line: string }) {
  const { lang } = usePrefs();
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 8, paddingRight: 12, borderRadius: Radius.full, backgroundColor: soft, borderWidth: 1, borderColor: line }}>
      <Icon name={icon} size={16} color={fg} />
      <ThemedText type="smallMedium" style={{ color: fg }} literal>
        {lang === 'bn' ? `${text}\u00A0` : text}
      </ThemedText>
    </View>
  );
}

const hideDefault = (name: string) => (name.trim().toLowerCase() === 'default' ? '' : name);

/**
 * One kind of an item. A bar across the top and the stock pill carry the stock level (green, orange, red), the price is the big
 * figure (green with the new price when an offer runs), and what the shop keeps is green, or red when it would lose money.
 */
export function VariantCard({ product, variant: v, offer, canEdit, onPrice, onOffer }: { product: Product; variant: Variant; offer: Offer | undefined; canEdit: boolean; onPrice: () => void; onOffer: () => void }) {
  const theme = useTheme();
  const { t, lang } = usePrefs();
  const levelStyle = useLevelStyle();
  const level = levelStyle(stockLevel(v.stock_on_hand, product.reorder_level));
  const name = hideDefault(v.name);
  const barcode = v.barcodes.find((b) => b.is_primary)?.barcode ?? v.barcodes[0]?.barcode;
  const note = v.cost_price !== undefined ? profitNote(v.cost_price, v.price) : null;
  const after = offer ? priceAfterOffer(v.price, offer) : null;
  const end = offer?.ends_on ? offer.ends_on.split('-').map(Number) : null;
  const qty = formatQuantity(v.stock_on_hand, product.unit_allow_decimal);
  const stockText = level.word === t('Finished') ? level.word : `${level.word} · ${qty}`;

  return (
    <View style={{ overflow: 'hidden', borderRadius: Radius.lg, borderCurve: 'continuous', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ height: 6, backgroundColor: level.fg }} />
      <View style={{ gap: Spacing.three, padding: Spacing.three }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two }}>
          {name ? (
            <ThemedText type="heading" literal>
              {name}
            </ThemedText>
          ) : null}
          <Pill icon={level.icon} text={stockText} fg={level.fg} soft={level.soft} line={level.line} />
        </View>

        <View style={{ gap: 4 }}>
          <ThemedText type="caption" themeColor="textMuted">
            You sell it at
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: Spacing.two }}>
            <ThemedText type="hero" literal style={after ? { textDecorationLine: 'line-through', color: theme.textMuted, fontSize: 24, lineHeight: 32 } : { color: note?.loss ? theme.danger : theme.success }}>
              {formatBDT(v.price)}
            </ThemedText>
            {after ? (
              <ThemedText type="hero" literal style={{ color: theme.success }}>
                {formatBDT(after)}
              </ThemedText>
            ) : null}
          </View>
          {offer ? <Pill icon="Tag" text={`${offer.mode === 'PERCENT' ? t('{n}% off', { n: Number(offer.value) }) : t('{amount} off', { amount: formatBDT(offer.value) })}${end ? ` · ${t('until {date}', { date: `${end[2]} ${MONTHS[lang][end[1] - 1]}` })}` : ''}`} fg={theme.success} soft={theme.successSoft} line={theme.successBorder} /> : null}
        </View>

        {note && v.cost_price !== undefined ? (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View style={{ flex: 1, gap: 2, padding: Spacing.two, borderRadius: Radius.md, backgroundColor: theme.canvas, borderWidth: 1, borderColor: theme.border }}>
              <ThemedText type="caption" themeColor="textMuted">
                You buy at
              </ThemedText>
              <ThemedText type="bodyMedium" literal>
                {formatBDT(v.cost_price)}
              </ThemedText>
            </View>
            <View style={{ flex: 1, gap: 2, padding: Spacing.two, borderRadius: Radius.md, backgroundColor: note.loss ? theme.dangerSoft : theme.successSoft, borderWidth: 1, borderColor: note.loss ? theme.dangerBorder : theme.successBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={note.loss ? 'TriangleAlert' : 'CheckCircle'} size={14} color={note.loss ? theme.danger : theme.success} />
                <ThemedText type="caption" style={{ color: note.loss ? theme.danger : theme.success }}>
                  {note.loss ? 'You lose' : 'You keep'}
                </ThemedText>
              </View>
              <ThemedText type="bodyMedium" literal style={{ color: note.loss ? theme.danger : theme.success }}>
                {`${formatBDT(note.profit.replace('-', ''))} · ${note.percent.replace('-', '')}%`}
              </ThemedText>
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="ScanLine" size={16} color={theme.textMuted} />
          <ThemedText type="caption" themeColor="textMuted" selectable literal style={{ flex: 1 }}>
            {`${v.sku}${barcode ? ` · ${barcode}` : ''}`}
          </ThemedText>
        </View>

        {canEdit ? (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <ActionTap icon="Cash" label="Change price" fg={theme.success} line={theme.successBorder} soft={theme.successSoft} onPress={onPrice} />
            <ActionTap icon="Tag" label={offer ? 'Change the offer' : 'Run an offer'} fg={theme.brandText} line={theme.brandSoftBorder} soft={theme.brandSoft} onPress={onOffer} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ActionTap({ icon, label, fg, line, soft, onPress }: { icon: IconName; label: string; fg: string; line: string; soft: string; onPress: () => void }) {
  const { t } = usePrefs();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={t(label)} onPress={onPress} style={{ flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10, borderRadius: Radius.md, borderCurve: 'continuous', backgroundColor: soft, borderWidth: 1.5, borderColor: line }}>
      <Icon name={icon} size={20} color={fg} />
      <ThemedText type="smallMedium" style={{ color: fg, flexShrink: 1, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </Tap>
  );
}
