export type Perm = { code: string; module: string; description: string };
export type ModuleGroup = { module: string; label: string; items: Perm[] };

/** "expense_category" -> "Expense category". */
export const moduleLabel = (m: string): string => (m ? m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ') : m);

/** The server's permission list as modules, in alphabetical order, each with its own permissions in order. */
export function groupPerms(perms: Perm[]): ModuleGroup[] {
  const by = new Map<string, Perm[]>();
  for (const p of perms) by.set(p.module, [...(by.get(p.module) ?? []), p]);
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([module, items]) => ({ module, label: moduleLabel(module), items }));
}

export type ModuleState = 'all' | 'some' | 'none';
export function moduleState(selected: string[], codes: string[]): ModuleState {
  const on = codes.filter((c) => selected.includes(c)).length;
  return on === 0 ? 'none' : on === codes.length ? 'all' : 'some';
}

/** One permission on or off. */
export const toggleOne = (selected: string[], code: string): string[] => (selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

/** A whole module: everything on, unless everything is already on, which turns it all off. */
export function toggleModule(selected: string[], codes: string[]): string[] {
  return moduleState(selected, codes) === 'all' ? selected.filter((c) => !codes.includes(c)) : [...new Set([...selected, ...codes])];
}

export type RoleForm = { name: string; description: string; permissions: string[] };
export function validateRole(f: RoleForm): { name?: string; permissions?: string } {
  const e: { name?: string; permissions?: string } = {};
  if (!f.name.trim()) e.name = 'Enter the role name.';
  if (f.permissions.length === 0) e.permissions = 'Choose at least one thing this role may do.';
  return e;
}
export const roleBody = (f: RoleForm) => ({ name: f.name.trim(), description: f.description.trim(), permissions: [...f.permissions].sort() });
