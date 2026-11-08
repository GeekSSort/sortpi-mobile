/** True when two names are the same shop name typed the same way: a one-branch shop often names its branch after the business. */
export const sameName = (a?: string | null, b?: string | null): boolean => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
