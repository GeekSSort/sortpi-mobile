import { useWindowDimensions } from 'react-native';

import { usePrefs } from './prefs';
import { scaled } from './translate';

/** How much bigger than normal text is right now: SortPi's own size setting times the phone's font size (capped at 1.3). */
export function useTextFactor(): number {
  const { size } = usePrefs();
  const { fontScale } = useWindowDimensions();
  return (scaled(100, size) / 100) * Math.min(Math.max(fontScale, 1), 1.3);
}

/** From here up, side-by-side layouts (icon beside label, three tiles in a row) no longer fit and should stack. */
export const BIG_TEXT = 1.3;
