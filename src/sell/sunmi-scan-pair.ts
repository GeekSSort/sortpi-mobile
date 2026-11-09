type ScanSource = 'keyboard' | 'broadcast';

/** SUNMI can emit one decode through both paths. Pair them once, without suppressing same-source repeats. */
export function sunmiScanPair() {
  const pending: { code: string; source: ScanSource; time: number }[] = [];
  return (code: string, source: ScanSource, time = Date.now(), record = true): boolean => {
    while (pending.length && time - pending[0].time > 350) pending.shift();
    const index = pending.findIndex((scan) => scan.code === code && scan.source !== source);
    if (index >= 0) {
      pending.splice(index, 1);
      return false;
    }
    if (record) pending.push({ code, source, time });
    return true;
  };
}
