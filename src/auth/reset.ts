import type { ApiClient } from '../api/client.ts';

/** The server's own floor (MinimumLengthValidator). Anything else it rejects comes back as VALIDATION_ERROR. */
export const MIN_PASSWORD_LENGTH = 8;

/** A message for the form, or null when the new password is acceptable to send. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password !== confirm) return 'The two passwords do not match.';
  return null;
}

/** Step 1. Always succeeds (204) whether or not the address has an account, so the screen never reveals which do. */
export async function requestResetCode(client: ApiClient, email: string): Promise<void> {
  await client.post('/auth/forgot-password', { email: email.trim() }, { anonymous: true });
}

/** Step 2. Returns the one-time ticket that buys exactly one password change. */
export async function verifyResetCode(client: ApiClient, email: string, code: string): Promise<string> {
  const data = await client.post<{ ticket: string }>('/auth/verify-code', { email: email.trim(), code: code.trim(), purpose: 'reset' }, { anonymous: true });
  return data.ticket;
}

/** Step 3. The server also revokes every token the account had, so other phones are signed out. */
export async function setNewPassword(client: ApiClient, ticket: string, password: string): Promise<void> {
  await client.post('/auth/set-password', { ticket, password, purpose: 'reset' }, { anonymous: true });
}

/** The two rules as they are typed, so each can tick off live. Matching only counts once something is typed in the second box. */
export function passwordChecks(password: string, confirm: string): { long: boolean; match: boolean } {
  return { long: password.length >= MIN_PASSWORD_LENGTH, match: confirm.length > 0 && password === confirm };
}
