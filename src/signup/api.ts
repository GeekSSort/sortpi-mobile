import { createApiClient, type ApiClient, type TokenStore } from '@/api/client';
import type { Plan } from '@/billing/logic';

import type { signupBody } from './logic';

const noTokens: TokenStore = { get: async () => ({ access: null, refresh: null }), set: async () => undefined, clear: async () => undefined };

/** A client for the calls made before any shop exists: no tokens, and its own address (the bare domain), not the saved shop. */
export const signupClient = (base: string): ApiClient => createApiClient({ baseUrl: () => base, tokens: noTokens });

export type Availability = { available: boolean; reason: string | null };

/** The plans a new company may start on (public, active ones). */
export const listSignupPlans = (c: ApiClient) => c.get<Plan[]>('/auth/signup/plans', { anonymous: true });

/** Is this web address free? Reads only. */
export const checkAddress = (c: ApiClient, value: string) => c.get<Availability>('/auth/signup/subdomain', { anonymous: true, query: { value } });

/** Does this email already have an account? Reads only. */
export const checkEmail = (c: ApiClient, value: string) => c.get<Availability>('/auth/signup/email', { anonymous: true, query: { value } });

/** Hold the details and email a code. Nothing is created yet, so a repeat after a lost connection is harmless. */
export const startSignup = (c: ApiClient, body: ReturnType<typeof signupBody>) => c.post<{ email: string; expiresInSeconds: number }>('/auth/signup', body, { anonymous: true });

export const resendSignup = (c: ApiClient, email: string) => c.post<unknown>('/auth/signup/resend', { email: email.trim() }, { anonymous: true });

/** The emailed code buys a one-time ticket that can set the password. */
export async function verifySignup(c: ApiClient, email: string, code: string): Promise<string> {
  const data = await c.post<{ ticket: string }>('/auth/verify-code', { email: email.trim(), code: code.trim(), purpose: 'signup' }, { anonymous: true });
  return data.ticket;
}

/** Creates the company and its owner. The ticket is spent either way, so a failure here means starting again. */
export const finishSignup = (c: ApiClient, ticket: string, password: string) => c.post<{ redirectTo: string }>('/auth/set-password', { ticket, password, purpose: 'signup' }, { anonymous: true });
