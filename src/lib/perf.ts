import { getPerformance, trace } from '@react-native-firebase/perf';

/**
 * Firebase Performance Monitoring. It measures app start, screen rendering and slow network calls by itself;
 * `timed` adds the two things a till cares about (looking a code up, posting a sale). Names only, never data:
 * no customer, item or amount ever goes into a trace.
 * Only release builds send data, so a developer's own testing does not skew the numbers.
 */
export function initPerformance(): void {
  try {
    getPerformance().dataCollectionEnabled = !__DEV__;
  } catch {
    // no Firebase app here (web or the build's route export): nothing to switch
  }
}

export async function timed<T>(name: string, run: () => Promise<T>): Promise<T> {
  const t = trace(getPerformance(), name);
  t.start();
  try {
    return await run();
  } finally {
    t.stop();
  }
}
