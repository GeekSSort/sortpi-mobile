import * as Device from 'expo-device';
import { initLlama, type LlamaContext } from 'llama.rn';
import { AppState } from 'react-native';

import { MODEL } from './model-spec';
import { loadModelState, modelPath } from './model-store';
import { buildPrompt, grammarFor, parsePlan, TOOLS, type NONE, type Plan, type ShopContext } from './plan';

let loaded: Promise<LlamaContext> | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;
let warming: Promise<void> | null = null;
/** While the chat is open the model stays in memory, so the instructions it already read are not read again for the next question. */
const KEEP_MS = 5 * 60_000;
const LEAVE_MS = 45_000;
const WAIT_MS = 30_000;

/** The model is used only when it is fully downloaded and the phone has the memory for it. */
export async function modelUsable(): Promise<boolean> {
  if (Device.totalMemory !== null && Device.totalMemory < MODEL.minRamBytes) return false;
  return (await loadModelState()).kind === 'ready';
}

/** Frees the model's memory (about 1.2 GB). The next question loads it again. */
export function releaseModel(): void {
  if (idle) clearTimeout(idle);
  idle = null;
  warming = null;
  const l = loaded;
  loaded = null;
  void l?.then((c) => c.release()).catch(() => undefined);
}

/** Free the memory after `ms` of nothing happening. Any use of the model pushes it back. */
function releaseLater(ms: number): void {
  if (idle) clearTimeout(idle);
  idle = setTimeout(releaseModel, ms);
}

/** When the person leaves the chat the model is let go soon; coming back within that time keeps it. */
export const modelNotNeededSoon = (): void => releaseLater(LEAVE_MS);

// A phone that is busy with something else needs its memory back: the model goes the moment the app is no longer in front.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') releaseModel();
});

function ensureLoaded(): Promise<LlamaContext> {
  loaded ??= initLlama({ model: modelPath().replace(/^file:\/\//, ''), n_ctx: 1024, n_gpu_layers: 0, use_mlock: false, use_mmap: true });
  return loaded;
}

/**
 * Reads the shop's instructions into the model ahead of the first question, while the person is still looking at the screen. Questions then only
 * pay for the few words they add, because the model keeps what it has already read as long as the start of the prompt is the same.
 */
export function warmUpModel(shop: ShopContext = {}): Promise<void> {
  warming ??= (async () => {
    try {
      const ctx = await ensureLoaded();
      await ctx.completion({ prompt: buildPrompt('', shop), grammar: grammarFor(shop.tools ?? TOOLS), n_predict: 1, temperature: 0, stop: ['<|im_end|>'] });
      releaseLater(KEEP_MS);
    } catch {
      releaseModel();
    }
  })();
  return warming;
}

/**
 * Asks the model to turn a sentence into a plan: which lookup, which dates, which item or name. The decoder is held to a grammar, so it
 * cannot write anything else, and nothing it says is shown: the answer is built from the shop's own data by the lookup. Any failure, a slow
 * phone or an unexpected reply gives null, and the person simply sees the nearest questions as before.
 */
export async function planQuestion(question: string, shop: ShopContext = {}): Promise<Plan | typeof NONE | null> {
  try {
    if (idle) clearTimeout(idle);
    await warming; // a warm-up in progress is already reading the same instructions
    const ctx = await ensureLoaded();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        void ctx.stopCompletion();
        resolve(null);
      }, WAIT_MS);
    });
    const run = ctx.completion({ prompt: buildPrompt(question, shop), grammar: grammarFor(shop.tools ?? TOOLS), n_predict: 90, temperature: 0, stop: ['<|im_end|>'] }).then((r) => parsePlan(r.text));
    const out = await Promise.race([run, timeout]);
    clearTimeout(timer);
    releaseLater(KEEP_MS);
    return out;
  } catch {
    releaseModel();
    return null;
  }
}
