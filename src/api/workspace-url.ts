import { ApiError } from './client.ts';

/** `acme` + `sortpi.com` -> https://acme.sortpi.com/api/v1. Dev servers may pass a full http://host:8000 URL. */
export function workspaceToBaseUrl(workspace: string, platformDomain: string, allowPlainHttp = false): string {
  const w = workspace.trim().toLowerCase();
  // A typed web address sends the password and every sale to that host: in a release build it must be https. Plain http is for a developer's own server.
  if (/^https:\/\//.test(w) || (allowPlainHttp && /^http:\/\//.test(w))) return `${w.replace(/\/+$/, '')}/api/v1`;
  if (/^https?:\/\//.test(w)) throw new ApiError(0, 'INSECURE_ADDRESS', 'A shop address must start with https://');
  return `https://${w}.${platformDomain}/api/v1`;
}
