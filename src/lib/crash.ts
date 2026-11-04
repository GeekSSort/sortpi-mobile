import { getCrashlytics, log, recordError, setAttribute, setUserId } from '@react-native-firebase/crashlytics';

import type { MeData } from '@/api/auth';

/**
 * Crash reports go to Firebase Crashlytics. Uncaught JavaScript errors and native crashes are caught by the library itself;
 * this adds who it happened to, in a form that cannot be traced back to a person: the opaque user id and the shop name,
 * never an email, a name, a phone number or any money figure.
 */
const crashlytics = () => getCrashlytics();

export function identify(me: MeData | null): void {
  void setUserId(crashlytics(), me?.id ? String(me.id) : '');
  void setAttribute(crashlytics(), 'shop', me?.organization?.name ?? '');
  void setAttribute(crashlytics(), 'roles', me?.roles?.join(',') ?? '');
}

/** A short breadcrumb that is sent with the next crash (screen names, never data the person typed). */
export const breadcrumb = (message: string): void => log(crashlytics(), message);

/** Report an error the app caught and recovered from. */
export function reportError(error: unknown, where?: string): void {
  recordError(crashlytics(), error instanceof Error ? error : new Error(String(error)), where);
}
