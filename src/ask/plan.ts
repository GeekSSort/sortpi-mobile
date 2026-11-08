/**
 * The phone's "AI": a question becomes a small plan (which lookup, which dates, which item or person), the app runs that lookup against the
 * shop's own data, and the figures on screen come from the lookup, never from the model. The model cannot name a lookup that is not on this
 * list, because the decoder is held to a grammar built from it.
 */
export type Period = 'today' | 'yesterday' | 'week' | 'month';
export const PERIODS: Period[] = ['today', 'yesterday', 'week', 'month'];
export const PERIOD_LABEL: Record<Period, string> = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 days', month: 'This month' };

export type ToolId =
  | 'sales_total' | 'sales_by_day' | 'top_products' | 'item_sales' | 'sales_by_category' | 'sales_by_payment' | 'sales_by_cashier' | 'sales_by_branch' | 'profit'
  | 'bills' | 'customer_dues' | 'supplier_dues' | 'customer_balance' | 'stock_low' | 'stock_out' | 'stock_of' | 'price_of' | 'start_selling'
  | 'expiring_soon' | 'expired_stock' | 'metal_rates' | 'orders_due';

/** `features` limits a lookup to shops of a trade that has it (any one of them); no `features` means every shop. */
export type Tool = { id: ToolId; label: string; meaning: string; needs: string[]; input?: 'item' | 'name'; features?: string[] };

export const TOOLS: Tool[] = [
  { id: 'sales_total', label: 'Sales', meaning: 'total sold and number of sales', needs: ['dashboard.view', 'report.sales', 'sale.view'] },
  { id: 'sales_by_day', label: 'Sales by day', meaning: 'sales day by day (a chart)', needs: ['report.sales'] },
  { id: 'top_products', label: 'Best sellers', meaning: 'best selling items', needs: ['report.sales'] },
  { id: 'item_sales', label: 'Sales of one item', meaning: 'how much of ONE named item was sold', needs: ['report.sales'], input: 'item' },
  { id: 'sales_by_category', label: 'Sales by category', meaning: 'sales split by category', needs: ['report.sales'] },
  { id: 'sales_by_payment', label: 'How customers paid', meaning: 'sales split by cash, bKash, card', needs: ['report.sales'] },
  { id: 'sales_by_cashier', label: 'Sales by cashier', meaning: 'sales per staff member', needs: ['report.sales'] },
  { id: 'sales_by_branch', label: 'Sales by branch', meaning: 'sales per branch', needs: ['report.sales'] },
  { id: 'profit', label: 'Profit', meaning: 'profit (gross)', needs: ['sale.view_profit'] },
  { id: 'bills', label: 'Bills', meaning: 'list of bills, optionally of one customer', needs: ['sale.view', 'sale.view_own'] },
  { id: 'customer_dues', label: 'Customers owe you', meaning: 'who owes the shop money (baki)', needs: ['report.finance'] },
  { id: 'supplier_dues', label: 'You owe suppliers', meaning: 'what the shop owes suppliers', needs: ['report.finance'] },
  { id: 'customer_balance', label: 'One customer', meaning: 'what ONE named customer owes', needs: ['customer.view'], input: 'name' },
  { id: 'stock_low', label: 'Running low', meaning: 'items running low', needs: ['product.view', 'inventory.view'] },
  { id: 'stock_out', label: 'Finished', meaning: 'items that are finished (zero stock)', needs: ['product.view', 'inventory.view'] },
  { id: 'stock_of', label: 'Stock of one item', meaning: 'how many of ONE named item are in stock', needs: ['product.view', 'inventory.view'], input: 'item' },
  { id: 'price_of', label: 'Price of one item', meaning: 'price of ONE named item', needs: ['product.view', 'inventory.view', 'pos.access'], input: 'item' },
  { id: 'start_selling', label: 'Start selling', meaning: 'open the till for a new sale', needs: ['pos.access'] },
  { id: 'expiring_soon', label: 'Expiring soon', meaning: 'batches that expire within 30 days (meyad)', needs: ['inventory.view'], features: ['expiry'] },
  { id: 'expired_stock', label: 'Expired stock', meaning: 'batches already expired', needs: ['inventory.view'], features: ['expiry'] },
  { id: 'metal_rates', label: 'Metal rates', meaning: "today's gold / silver rate per gram", needs: ['product.view', 'inventory.view'], features: ['metal_rate'] },
  { id: 'orders_due', label: 'Orders due', meaning: 'tailoring / repair orders due this week or overdue', needs: ['sale.view'], features: ['tailoring', 'repair'] },
];

/** The lookups this shop can use: its trade has the feature (or none is needed) and the person may open them. */
export const toolsFor = (features: readonly string[] | undefined, perms: readonly string[] | undefined): Tool[] =>
  TOOLS.filter((t) => t.needs.some((c) => perms?.includes(c)) && (!t.features || t.features.some((f) => features?.includes(f))));

/** Does this shop's trade have the lookup? (Separate from permission: a pharmacy has expiry, a grocery does not.) */
export const toolOffered = (tool: ToolId, features: readonly string[] | undefined): boolean => {
  const t = TOOLS.find((x) => x.id === tool);
  return !!t && (!t.features || t.features.some((f) => features?.includes(f)));
};

export type Plan = { tool: ToolId; period: Period; item: string; name: string };
export const NONE = 'none' as const;

export const toolAllowed = (tool: ToolId, perms: readonly string[] | undefined): boolean => !!TOOLS.find((t) => t.id === tool)?.needs.some((c) => perms?.includes(c));

/** Which input a plan still lacks: "pani" alone cannot say which item, "ask about a customer" cannot say which. */
export function missingInput(p: Plan): 'item' | 'name' | null {
  const need = TOOLS.find((t) => t.id === p.tool)?.input;
  return need === 'item' && !p.item ? 'item' : need === 'name' && !p.name ? 'name' : null;
}

/** The decoder may only write this exact shape: one tool id (or none), one period, and two short plain-letter strings. */
const q = '\\"';
export const grammarFor = (tools: readonly Tool[]): string =>
  [
    `root ::= "{${q}tool${q}:${q}" tool "${q},${q}period${q}:${q}" period "${q},${q}item${q}:${q}" text "${q},${q}name${q}:${q}" text "${q}}"`,
    `tool ::= ${[...tools.map((t) => `"${t.id}"`), `"${NONE}"`].join(' | ')}`,
    `period ::= ${PERIODS.map((p) => `"${p}"`).join(' | ')}`,
    'text ::= [a-zA-Z0-9 ]{0,40}',
  ].join('\n');
export const GRAMMAR = grammarFor(TOOLS);

const EXAMPLES: [string, Plan | null][] = [
  ['ajker bill koto', { tool: 'sales_total', period: 'today', item: '', name: '' }],
  ['pani koy botte', { tool: 'stock_of', period: 'today', item: 'water', name: '' }],
  ['gotokal pani koto bikri hoyeche', { tool: 'item_sales', period: 'yesterday', item: 'water', name: '' }],
  ['karim er baki koto', { tool: 'customer_balance', period: 'today', item: '', name: 'karim' }],
  ['ei mashe kon category beshi bikri', { tool: 'sales_by_category', period: 'month', item: '', name: '' }],
  ['coca cola dam koto', { tool: 'price_of', period: 'today', item: 'coca cola', name: '' }],
  ['oshudher meyad kobe sesh hobe', { tool: 'expiring_soon', period: 'today', item: '', name: '' }],
  ['sonar dam ajke koto', { tool: 'metal_rates', period: 'today', item: '', name: '' }],
  ['ei soptahe kon order dite hobe', { tool: 'orders_due', period: 'week', item: '', name: '' }],
  ['ajke kon cashier koto sale korse', { tool: 'sales_by_cashier', period: 'today', item: '', name: '' }],
  ['gotokal ke ke kinse', { tool: 'bills', period: 'yesterday', item: '', name: '' }],
  ['weather kemon', null],
];
const json = (p: Plan | null) => (p ? JSON.stringify(p) : JSON.stringify({ tool: NONE, period: 'today', item: '', name: '' }));

export type ShopContext = { business?: string; features?: readonly string[]; words?: { categories: string[]; brands: string[]; units: string[]; items: string[] } | null; tools?: readonly Tool[] };

/** What the model is told about this shop: its trade, what its trade has switched on, and the words the shop itself uses. */
export function profileText(c: ShopContext): string {
  const lines: string[] = [];
  if (c.business) lines.push(`This shop is a ${c.business}.`);
  if (c.features?.length) lines.push(`Its trade uses: ${c.features.join(', ')}.`);
  const w = c.words;
  if (w?.categories.length) lines.push(`Its categories: ${w.categories.join(', ')}.`);
  if (w?.brands.length) lines.push(`Its brands: ${w.brands.join(', ')}.`);
  if (w?.units.length) lines.push(`Its units: ${w.units.join(', ')}.`);
  if (w?.items.length) lines.push(`Some of its items: ${w.items.join(', ')}.`);
  return lines.join('\n');
}

const RULES = [
  'period is one of ' + PERIODS.join(', ') + ' (default today).',
  'item is the product in plain English, or as the shop writes it (pani means water, chini sugar, chal rice, tel oil). name is a person\'s name.',
  'baki: about a person it is money owed; about an item it is stock left. nogod means cash. kal means yesterday unless the verb is future (kal hobe, kal dibo).',
  `Use ${NONE} for anything that is not about the shop's own data.`,
].join('\n');

/** Qwen3 chat format with thinking switched off, so the first token is already the answer. */
export function buildPrompt(question: string, c: ShopContext = {}): string {
  const tools = c.tools ?? TOOLS;
  const ids = new Set(tools.map((t) => t.id));
  const menu = tools.map((t) => `${t.id}: ${t.meaning}`).join('\n');
  // Every token of the prompt is read again on each question, so it stays short: six worked examples that fit this shop, then the refusal.
  const fit = EXAMPLES.filter(([, p]) => p && ids.has(p.tool)).slice(0, 6);
  const shots = [...fit, ...EXAMPLES.filter(([, p]) => !p)].map(([e, p]) => `Q: ${e}\nA: ${json(p)}`).join('\n');
  const profile = profileText(c);
  const system = `A shopkeeper in Bangladesh types a question to their shop app, in Bangla, English or Banglish (Bangla in English letters), often misspelt. Turn it into one lookup. Answer with JSON only.\n${profile ? profile + '\n' : ''}${RULES}\nLookups:\n${menu}\n${shots}`;
  return `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${question.trim().slice(0, 200)}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 40) : '');

/** The model's text as a plan, 'none', or null when it is anything else (so a bad reply is never acted on). */
export function parsePlan(text: string): Plan | typeof NONE | null {
  try {
    const j: unknown = JSON.parse(text.trim());
    if (!j || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    if (o.tool === NONE) return NONE;
    const tool = TOOLS.find((t) => t.id === o.tool)?.id;
    const period = PERIODS.find((p) => p === o.period);
    if (!tool || !period) return null;
    return { tool, period, item: clean(o.item), name: clean(o.name) };
  } catch {
    return null;
  }
}

/** One line saying what was understood, so the person can see it and correct it: "Sales of one item · Yesterday · water". */
export function describePlan(p: Plan, tr: (s: string) => string): string {
  const t = TOOLS.find((x) => x.id === p.tool);
  return [tr(t?.label ?? p.tool), tr(PERIOD_LABEL[p.period]), p.item || p.name].filter(Boolean).join(' · ');
}
