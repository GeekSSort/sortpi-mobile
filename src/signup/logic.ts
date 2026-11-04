import { ApiError } from '../api/client.ts';

/** What a new company says about itself. Kept as typed text until it is sent. */
export type ShopForm = { shopName: string; address: string; category: string; ownerName: string; email: string; phone: string; planCode: string };

export const EMPTY_FORM: ShopForm = { shopName: '', address: '', category: '', ownerName: '', email: '', phone: '', planCode: '' };

/** The kinds of shop the server knows, with the words a shopkeeper uses. English keys, translated on screen. */
export const CATEGORIES: { code: string; title: string }[] = [
  { code: 'grocery', title: 'Grocery & supermarket' },
  { code: 'fabric', title: 'Fabric & textiles' },
  { code: 'fashion', title: 'Fashion & clothing' },
  { code: 'pharmacy', title: 'Pharmacy' },
  { code: 'electronics', title: 'Electronics & mobile' },
  { code: 'cosmetics', title: 'Cosmetics & beauty' },
  { code: 'hardware', title: 'Hardware & paint' },
  { code: 'footwear', title: 'Footwear & bags' },
  { code: 'bakery', title: 'Bakery & sweets' },
  { code: 'wellness', title: 'Health & wellness' },
];

/** A web address made from a shop name: lowercase letters, digits and single hyphens. A Bangla name gives nothing, and the person types one. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '');
}

/** Why a web address cannot be used, as an English key, or null when its shape is fine. Whether it is free is the server's to say. */
export function addressProblem(a: string): string | null {
  if (!a) return 'Choose a web address for your shop.';
  if (a.length < 3) return 'Use at least 3 letters or digits.';
  if (a.length > 63) return 'Keep it to 63 letters or digits.';
  if (!/^[a-z0-9-]+$/.test(a)) return 'Use only small letters, digits and hyphens.';
  if (a.startsWith('-') || a.endsWith('-')) return 'It cannot start or end with a hyphen.';
  return null;
}

export const emailProblem = (e: string): string | null => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()) ? null : 'Type an email address, like name@example.com.');

export type StepProblem = { field: keyof ShopForm; text: string };

/** Step one: the shop. */
export function shopProblem(f: ShopForm): StepProblem | null {
  if (!f.shopName.trim()) return { field: 'shopName', text: "Type your shop's name." };
  if (f.shopName.trim().length > 200) return { field: 'shopName', text: 'Keep the name to 200 letters.' };
  if (!f.category) return { field: 'category', text: 'Pick what you sell.' };
  const a = addressProblem(f.address);
  return a ? { field: 'address', text: a } : null;
}

/** Step two: the owner. The phone number is optional. */
export function ownerProblem(f: ShopForm): StepProblem | null {
  if (!f.ownerName.trim()) return { field: 'ownerName', text: 'Type your name.' };
  const e = emailProblem(f.email);
  if (e) return { field: 'email', text: e };
  if (f.phone.trim().length > 50) return { field: 'phone', text: 'Keep the phone number shorter.' };
  return null;
}

/** The body `POST /auth/signup` wants. Sign-up is the one call that names its fields in camelCase. */
export function signupBody(f: ShopForm) {
  const phone = f.phone.trim();
  return { companyName: f.shopName.trim(), subdomain: f.address, ownerName: f.ownerName.trim(), email: f.email.trim(), ...(phone ? { phone } : {}), planCode: f.planCode, businessCategory: f.category };
}

/** Where the sign-up calls go. A new company has no address of its own yet, so it uses the bare domain; a development server (plain http) is used as it is. */
export function signupBase(workspaceUrl: string | null, platformDomain: string): string {
  if (workspaceUrl && /^http:\/\//.test(workspaceUrl)) return workspaceUrl;
  return `https://${platformDomain}/api/v1`;
}

/** The shop's address as it will be shown. */
export const shopHost = (address: string, platformDomain: string) => `${address || 'your-shop'}.${platformDomain}`;

/** Which step of the five the screen is on, for "Step 2 of 5". */
export const STEPS = ['shop', 'owner', 'plan', 'code', 'password'] as const;
export type Step = (typeof STEPS)[number];

/** Seconds left before another code may be asked for, from when the last one was sent. */
export function resendWait(sentAt: number, now: number, cooldown = 30): number {
  return Math.max(0, Math.ceil(cooldown - (now - sentAt) / 1000));
}

export function describeSignupError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'EMAIL_IN_USE':
      return 'That email already has an account. Sign in instead, or use another email.';
    case 'SUBDOMAIN_IN_USE':
      return 'That web address is taken. Choose another.';
    case 'RESERVED_SUBDOMAIN':
    case 'INVALID_SUBDOMAIN':
      return 'That web address cannot be used. Choose another.';
    case 'CODE_INVALID':
      return 'That code is not right. Check your email and try again.';
    case 'CODE_EXPIRED':
      return 'That code has run out. Ask for a new one.';
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many wrong tries. Ask for a new code.';
    case 'RESEND_TOO_SOON':
      return 'A code was sent a moment ago. Wait a little, then try again.';
    case 'THROTTLED':
      return 'Too many tries. Wait a few minutes, then try again.';
    case 'TICKET_INVALID':
      return 'This took too long. Start again from the first step.';
    case 'VALIDATION_ERROR':
      return e.errors && 'password' in e.errors ? 'That password is not allowed. Use at least 8 characters.' : 'Check what you typed and try again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Nothing was lost. Try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}
