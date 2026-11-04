import { useQuery } from '@tanstack/react-query';

import { shopUsesBarcodes } from './catalog';

/** False only when the shop turned barcodes off in Settings (catalog.use_barcodes). Unknown or failed counts as on, so scanning is never hidden by mistake. */
export function useUsesBarcodes(): boolean {
  return useQuery({ queryKey: ['settings', 'barcodes'], queryFn: shopUsesBarcodes, staleTime: 10 * 60_000 }).data !== false;
}
