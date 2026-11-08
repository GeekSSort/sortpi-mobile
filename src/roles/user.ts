export type UserForm = { email: string; name: string; phone: string; password: string; roles: string[] };
export type UserErrors = Partial<Record<'email' | 'name' | 'password' | 'roles', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is missing before the server is asked. The server still has the last word on the password rules. */
export function validateUser(f: UserForm, isNew: boolean): UserErrors {
  const e: UserErrors = {};
  if (!f.name.trim()) e.name = 'Enter the name.';
  if (isNew && !EMAIL.test(f.email.trim())) e.email = 'Enter an email like name@example.com.';
  if (isNew && f.password.length < 8) e.password = 'Use at least 8 letters or numbers.';
  if (f.roles.length === 0) e.roles = 'Choose what this person may do.';
  return e;
}

/** A role added or removed, by name. */
export const toggleName = (list: string[], name: string): string[] => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
