/**
 * Answer from the phone's own copy at once, and let the server confirm in the background.
 *
 * - `local` hit: returned immediately. `remote` still runs, and `onRemote` gets its answer (an item, or `null` when the server no longer has it)
 *   so the caller can correct what it showed. A failing `remote` is ignored: the local answer already stands.
 * - `local` miss, no copy, or error: `remote` is awaited as before, so an item that is not on the phone yet (or a phone without a copy) behaves
 *   exactly like today, errors included.
 */
export async function localFirst<T>(
  local: () => Promise<T | null | undefined>,
  remote: () => Promise<T | null>,
  onRemote?: (answer: T | null) => void,
): Promise<T | null> {
  const hit = await local().catch(() => undefined);
  if (hit) {
    void remote().then((answer) => onRemote?.(answer), () => undefined);
    return hit;
  }
  return remote();
}
