import { ApiError } from '../api/client.ts';

/** Words a person can read for each thing the login can go wrong with (codes from the server's registry). */
export function describeAuthError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Could not sign in. Please try again.';
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'ACCOUNT_LOCKED':
      return 'Too many attempts. This account is locked for a while.';
    case 'ACCOUNT_INACTIVE':
    case 'ACCOUNT_DISABLED':
      return 'This account has been switched off. Ask the shop owner.';
    case 'SUBSCRIPTION_INACTIVE':
      return "Your shop's SortPi plan is not active. Please contact SortPi support.";
    case 'TENANT_MISMATCH':
      return 'This account belongs to a different shop. Check the shop name.';
    case 'TENANT_NOT_FOUND':
      return 'We could not find a shop with that name. Check the spelling and try again.';
    case 'TENANT_INACTIVE':
      return 'This shop has been closed. Please contact SortPi support.';
    case 'REALM_MISMATCH':
      return 'That is a SortPi staff account. Use your shop account here.';
    case 'RATE_LIMITED':
    case 'THROTTLED':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Check your internet and try again.';
    case 'CODE_INVALID':
      return 'That code is not right. Check it and try again.';
    case 'CODE_EXPIRED':
      return 'That code has expired. Ask for a new one.';
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many wrong codes. Ask for a new one.';
    case 'TICKET_INVALID':
      return 'This took too long. Please start again from the sign-in screen.';
    case 'WORKSPACE_UNREACHABLE':
      return 'We could not reach that shop. Check the name and your internet.';
    case 'NO_WORKSPACE':
      return 'Type your shop name first.';
    default:
      return error.message || 'Could not sign in. Please try again.';
  }
}
