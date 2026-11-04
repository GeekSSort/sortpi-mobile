import { Pill } from '@/products/variant-card';
import { useTheme } from '@/hooks/use-theme';
import { usePrefs } from '@/i18n/prefs';
import type { IconName } from '@/components/icons/icon';

import type { CustomerOrder, Quotation } from './api';
import { dueState, dueWords, ORDER_WORDS, type OrderStatus } from './logic';

type Look = { fg: string; soft: string; line: string; icon: IconName };

/** One colour for each situation an order can be in: green ready or finished, blue waiting, orange due today, red late, grey cancelled. */
export function useOrderLook() {
  const theme = useTheme();
  const { t } = usePrefs();
  const ok: Look = { fg: theme.success, soft: theme.successSoft, line: theme.successBorder, icon: 'CheckCircle' };
  const wait: Look = { fg: theme.brandText, soft: theme.brandSoft, line: theme.brandSoftBorder, icon: 'Package' };
  const warn: Look = { fg: theme.warning, soft: theme.warningSoft, line: `${theme.warning}55`, icon: 'TriangleAlert' };
  const bad: Look = { fg: theme.danger, soft: theme.dangerSoft, line: theme.dangerBorder, icon: 'TriangleAlert' };
  const off: Look = { fg: theme.textMuted, soft: theme.canvas, line: theme.border, icon: 'Cancel' };
  return {
    status: (s: OrderStatus): Look & { word: string } => ({ ...(s === 'COLLECTED' || s === 'READY' ? ok : s === 'CANCELLED' ? off : wait), word: t(ORDER_WORDS[s]) }),
    due: (o: { status: string; due_date: string }): (Look & { word: string }) | null => {
      const d = dueState(o);
      if (d.state === 'done') return null;
      const w = dueWords(d.days);
      return { ...(d.state === 'late' ? bad : d.state === 'today' ? warn : wait), word: w.n === undefined ? t(w.key) : t(w.key, { n: w.n }) };
    },
    /** The colour of the bar down the left of a row: what the shop should look at first. */
    bar: (o: { status: string; due_date: string }): string => {
      if (o.status === 'CANCELLED') return theme.border;
      if (o.status === 'COLLECTED') return theme.success;
      const d = dueState(o);
      return d.state === 'late' ? theme.danger : d.state === 'today' ? theme.warning : o.status === 'READY' ? theme.success : theme.brand;
    },
    quote: (q: Pick<Quotation, 'status' | 'expired'>): Look & { word: string } => (q.status === 'SENT' ? { ...ok, word: t('Sent to the till') } : q.status === 'CANCELLED' ? { ...off, word: t('Cancelled') } : q.expired ? { ...bad, word: t('Past its last day') } : { ...wait, word: t('Still open') }),
  };
}

export function OrderPills({ order }: { order: Pick<CustomerOrder, 'status' | 'due_date'> }) {
  const look = useOrderLook();
  const s = look.status(order.status);
  const d = look.due(order);
  return (
    <>
      <Pill icon={s.icon} text={s.word} fg={s.fg} soft={s.soft} line={s.line} />
      {d ? <Pill icon={d.icon} text={d.word} fg={d.fg} soft={d.soft} line={d.line} /> : null}
    </>
  );
}
