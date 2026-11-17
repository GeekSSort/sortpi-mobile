import { useCallback } from 'react';

import { cue } from '@/lib/cues';

/** What a scan came to: a product found (`true`), nothing found (`false`), or a product that is already in the cart (`'again'`). */
export type ScanResult = boolean | 'again';

export function useScanFeedback() {
  return useCallback((result: ScanResult) => cue(result === 'again' ? 'again' : result ? 'found' : 'missing'), []);
}
