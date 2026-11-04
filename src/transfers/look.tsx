import { useTheme } from '@/hooks/use-theme';

import { STATUS, type Transfer } from './logic';

/** Colours, picture and words for a transfer's status: grey not sent, orange on the way, green arrived, red cancelled. */
export function useStatusLook() {
  const theme = useTheme();
  return (status: Transfer['status']) => {
    const k = STATUS[status];
    const c = { plain: { fg: theme.textSecondary, soft: theme.canvas, line: theme.border }, warn: { fg: theme.warning, soft: theme.warningSoft, line: `${theme.warning}55` }, good: { fg: theme.success, soft: theme.successSoft, line: theme.successBorder }, bad: { fg: theme.danger, soft: theme.dangerSoft, line: theme.dangerBorder } }[k.tone];
    return { ...c, icon: k.icon, words: k.words };
  };
}
