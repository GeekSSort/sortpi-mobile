import { buildProductRequest, openingStockBody, type NewProductForm } from '../catalog/new-product.ts';
import type { OutboxRow, Progress } from './outbox.ts';

export type Photo = { uri: string; name: string; type: string };
type Variant = { id: string; name: string; sku?: string };
export type MadeProduct = { id: string; variants: Variant[] };

/** What goes in the outbox row's payload for a new product. */
export type ProductJob = { form: NewProductForm; branchId: string; photo: Photo | null; name: string };

/** The few server calls sending needs. Passed in so the steps can be tested without a server (and the app fills them with the real calls). */
export type SendDeps = {
  create(body: unknown, key: string): Promise<MadeProduct>;
  /** An item with this name that the server made since the job was written, or null. Asked only after a try that may have got through. */
  findExisting(job: ProductJob, since: number): Promise<MadeProduct | null>;
  warehouse(branchId: string): Promise<string>;
  stock(body: unknown, key: string): Promise<void>;
  upload(productId: string, photo: Photo): Promise<void>;
  /** Writes down a step that worked. */
  save(progress: Progress): Promise<void>;
};

/**
 * Sends one new product to the server in the same three steps the form used to do while the person waited: make the item, count its
 * opening stock in, put its photo on. Each step that works is written down, so a retry carries on from the next one: the item is never made
 * twice by a retry of the stock or the photo, and the stock is counted once (one key). A try that failed before step 1 may still have made the
 * item (the answer was lost), so the server is asked for it first instead of making a second one.
 */
export async function sendProduct(row: OutboxRow, job: ProductJob, d: SendDeps): Promise<void> {
  let productId = row.product_id;
  let variants: Variant[] = row.made ? (JSON.parse(row.made) as Variant[]) : [];

  if (row.step < 1) {
    const found = row.attempts > 0 ? await d.findExisting(job, row.created_at) : null;
    const made = found ?? (await d.create(buildProductRequest(job.form), row.id));
    productId = made.id;
    variants = made.variants ?? [];
    await d.save({ step: 1, product_id: made.id, made: JSON.stringify(variants) });
  }

  if (row.step < 2) {
    const wantsStock = Boolean(job.form.openingStock?.trim()) || (job.form.variants ?? []).some((v) => v.opening.trim());
    const wh = wantsStock ? await d.warehouse(job.branchId) : null;
    const body = wh ? openingStockBody(job.form, variants, wh) : null;
    if (body) await d.stock(body, row.stock_key);
    await d.save({ step: 2 });
  }

  if (row.step < 3 && job.photo && productId) {
    await d.upload(productId, job.photo);
    await d.save({ step: 3 });
  }
}
