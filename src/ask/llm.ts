import * as Device from 'expo-device';
import { initLlama, type LlamaContext } from 'llama.rn';

import { MODEL } from './model-spec';
import { loadModelState, modelPath } from './model-store';
import { buildPrompt, GRAMMAR, parsePlan, type NONE, type Plan } from './plan';

let loaded: Promise<LlamaContext> | null = null;
let idle: ReturnType<typeof setTimeout> | null = null;
const KEEP_MS = 90_000;
const WAIT_MS = 30_000;

/** The model is used only when it is fully downloaded and the phone has the memory for it. */
export async function modelUsable(): Promise<boolean> {
  if (Device.totalMemory !== null && Device.totalMemory < MODEL.minRamBytes) return false;
  return (await loadModelState()).kind === 'ready';
}

function release(): void {
  const l = loaded;
  loaded = null;
  void l?.then((c) => c.release()).catch(() => undefined);
}

/**
 * Asks the model to turn a sentence into a plan: which lookup, which dates, which item or name. The decoder is held to a grammar, so it
 * cannot write anything else, and nothing it says is shown: the answer is built from the shop's own data by the lookup. Any failure, a slow
 * phone or an unexpected reply gives null, and the person simply sees the nearest questions as before.
 */
export async function planQuestion(question: string): Promise<Plan | typeof NONE | null> {
  try {
    if (idle) clearTimeout(idle);
    loaded ??= initLlama({ model: modelPath().replace(/^file:\/\//, ''), n_ctx: 2048, n_gpu_layers: 0, use_mlock: false });
    const ctx = await loaded;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        void ctx.stopCompletion();
        resolve(null);
      }, WAIT_MS);
    });
    const run = ctx.completion({ prompt: buildPrompt(question), grammar: GRAMMAR, n_predict: 90, temperature: 0, stop: ['<|im_end|>'] }).then((r) => parsePlan(r.text));
    const out = await Promise.race([run, timeout]);
    clearTimeout(timer);
    // Free the memory soon after use: the model is large and the shop app should not hold it while someone is selling.
    idle = setTimeout(release, KEEP_MS);
    return out;
  } catch {
    release();
    return null;
  }
}
