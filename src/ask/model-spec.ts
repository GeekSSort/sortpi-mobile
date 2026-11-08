/**
 * The one local language model the phone can download. It never writes an answer: it only picks which of the app's own questions a
 * sentence means (see pick.ts), and the answer is then built from the shop's data as usual.
 * The file is pinned to one commit of the repository, so it cannot change under the app, and its size is checked after download.
 */
export const MODEL = {
  id: 'qwen3-1.7b-q4_k_m',
  file: 'qwen3-1.7b-q4_k_m.gguf',
  url: 'https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/d7f544eead698dbd1f15126ef60b45a1e1933222/Qwen3-1.7B-Q4_K_M.gguf',
  bytes: 1_107_409_472,
  sha256: 'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897',
  /** The model needs about this much memory while it runs; phones with less keep using the word matcher only. */
  minRamBytes: 3_800_000_000,
} as const;
