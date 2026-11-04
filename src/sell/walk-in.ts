/** The shop's shared "customer" for sales to people who are not on file. The web till makes it on first use, so the phone does too. */
export const WALK_IN_CODE = 'CUS-WALKIN';
export const WALK_IN_NAME = 'Walk-in Customer';

/** Same test as the web till: the code, or (for a record made by hand) the name. */
export const isWalkIn = (c: { code?: string | null; name?: string | null }): boolean =>
  (c.code ?? '').toUpperCase() === WALK_IN_CODE || (c.name ?? '').trim().toLowerCase() === WALK_IN_NAME.toLowerCase();

/** Body for POST /customers/ when the shop has none yet. */
export const walkInBody = () => ({ code: WALK_IN_CODE, name: WALK_IN_NAME, phone: '', customer_type: 'RETAIL' });
