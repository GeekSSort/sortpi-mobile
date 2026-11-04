/**
 * A person-friendly name for the workspace behind an API base URL:
 * `https://acme-traders.sortpi.com/api/v1` -> "Acme Traders". Addresses with no name in them
 * (an IP or localhost, used in development) are shown as the host itself.
 */
export function workspaceDisplayName(baseUrl: string | null): string {
  if (!baseUrl) return '';
  let host: string;
  try {
    host = new URL(baseUrl).host;
  } catch {
    return '';
  }
  const hostname = host.split(':')[0];
  const looksLikeAddress = hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  if (looksLikeAddress) return host;
  const first = hostname.split('.')[0];
  return first
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/** The shop's own name, the part before the platform domain (`acme-traders` in `https://acme-traders.sortpi.com/api/v1`). Null for a development address, which has no name. */
export function shopNameOf(baseUrl: string | null, platformDomain: string): string | null {
  if (!baseUrl) return null;
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return null;
  }
  const tail = `.${platformDomain}`;
  return host.endsWith(tail) && host.length > tail.length ? host.slice(0, -tail.length) : null;
}

/** What an owner sends to staff so they can find the shop: the name to type, and the web address. */
export const shareMessage = (name: string, platformDomain: string) => ({ name, host: `${name}.${platformDomain}` });
