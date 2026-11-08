import { INTENTS, type IntentId } from './intents.ts';

/** What each question means, in plain English, for the model. The Banglish examples come from the same list the word matcher uses. */
const MEANING: Record<IntentId, string> = {
  sales_today: 'how much was sold today', sales_yesterday: 'how much was sold yesterday', sales_week: 'sales over the last 7 days',
  low_stock: 'which items are running low', out_of_stock: 'which items are finished', top_products: 'best selling items',
  bills_today: "list today's bills", due_amount: 'how much customers owe the shop', supplier_due: 'how much the shop owes suppliers',
  profit_today: 'profit today', payments_today: 'how customers paid today (cash, bKash, card)', product_price: 'the price of one named item',
  product_stock: 'how many of one named item are in stock', start_selling: 'start a new sale',
};

export type Pick = IntentId | 'none';
export const NONE = 'none';

/** The model may say exactly one of these words and nothing else: the decoder is not allowed to produce anything outside this list. */
export const GRAMMAR = `root ::= ${[...INTENTS.map((i) => `"${i.id}"`), `"${NONE}"`].join(' | ')}`;

/** Qwen3 chat format with thinking switched off, so the first token is already the answer. */
export function buildPrompt(question: string): string {
  const menu = INTENTS.map((i) => `${i.id}: ${MEANING[i.id]} (e.g. "${i.examples.slice(0, 2).join('", "')}")`).join('\n');
  const system = `A shopkeeper in Bangladesh types a question to their shop app, in Bangla, English or Banglish (Bangla in English letters), often misspelt. Pick the one id that means the same thing. If it is not a question about the shop, answer ${NONE}.\n${menu}`;
  return `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${question.trim().slice(0, 200)}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}

/** The model's text as an id, or null when it is anything else (so a bad answer is never acted on). */
export function parsePick(text: string): Pick | null {
  const t = text.trim();
  if (t === NONE) return NONE;
  return INTENTS.find((i) => i.id === t)?.id ?? null;
}
