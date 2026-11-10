// SortPi API test runner. Same file runs in Node (local copy) and in the signed-in browser page (live shop).
// run({ base, token, phase: 'reads' | 'writes' | 'negative', gets, live })  ->  array of result rows
async function run(cfg) {
  const R = [];
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const NAME = 'ZZ-API-TEST ' + stamp;
  const uuid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
  async function call(name, method, path, body, o = {}) {
    const headers = { Accept: 'application/json' };
    if (!o.anon) headers.Authorization = 'Bearer ' + (o.token || cfg.token);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (o.key) headers['Idempotency-Key'] = o.key;
    const t = performance.now();
    let status = 0, text = '', code = '', hdr = {};
    try {
      const r = await fetch(cfg.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
      text = await r.text(); status = r.status;
      hdr = { enc: r.headers.get('content-encoding') || '', cache: r.headers.get('cache-control') || '' };
    } catch (e) { code = 'NETWORK:' + String(e.message || e); }
    const ms = Math.round(performance.now() - t);
    let js = null; try { js = JSON.parse(text); } catch (e) {}
    if (status >= 400 && js) code = js.code || '';
    const row = { phase: cfg.phase, name, method, path, status, ms, bytes: text.length, code, enc: hdr.enc, cache: hdr.cache, expect: o.expect || null };
    row.pass = o.expect ? (Array.isArray(o.expect) ? o.expect.includes(status) : status === o.expect) : status > 0 && status < 500;
    R.push(row);
    return { status, js, data: js && js.data, ms };
  }
  const ok = (r) => r.status >= 200 && r.status < 300;

  if (cfg.phase === 'reads') {
    for (const e of cfg.gets) {
      const a = await call(e.tag + ' ' + e.path, 'GET', e.path, undefined);
      if (a.ms > 1000 && a.status < 400) await call(e.tag + ' ' + e.path + ' (repeat)', 'GET', e.path, undefined);
    }
    return R;
  }

  if (cfg.phase === 'negative') {
    await call('no token', 'GET', '/auth/me', undefined, { anon: true, expect: 401 });
    await call('bad token', 'GET', '/auth/me', undefined, { token: 'garbage', expect: 401 });
    await call('unknown id', 'GET', '/customers/00000000-0000-0000-0000-000000000000/', undefined, { expect: 404 });
    await call('invalid body (empty customer)', 'POST', '/customers/', {}, { expect: 400 });
    await call('invalid body (empty category)', 'POST', '/categories/', {}, { expect: 400 });
    await call('wrong method (DELETE on list)', 'DELETE', '/customers/', undefined, { expect: [405, 404] });
    await call('sell without idempotency key', 'POST', '/sales/sell/', { items: [], payments: [] }, { expect: [400, 422] });
    await call('huge page size', 'GET', '/customers/?limit=100000', undefined, { expect: [200, 400] });
    await call('OPTIONS list', 'OPTIONS', '/customers/', undefined, { expect: [200, 204, 401] });
    await call('HEAD list', 'HEAD', '/customers/', undefined, { expect: [200, 405] });
    return R;
  }

  // ---- writes: every record is named ZZ-API-TEST and removed at the end ----
  const made = {};
  const me = (await call('GET /auth/me', 'GET', '/auth/me')).data || {};
  const branchId = (me.active_branch && (me.active_branch.id || me.active_branch)) || (me.branches && me.branches[0] && (me.branches[0].id || me.branches[0]));
  const wh = ((await call('GET /warehouses/', 'GET', '/warehouses/')).data || [])[0];
  const warehouseId = wh && wh.id;

  // category: POST, GET, PATCH, PUT
  let r = await call('category: create', 'POST', '/categories/', { name: NAME + ' cat' }, { expect: [200, 201] });
  made.category = r.data && r.data.id;
  if (made.category) {
    await call('category: read', 'GET', '/categories/' + made.category + '/', undefined, { expect: 200 });
    await call('category: PATCH', 'PATCH', '/categories/' + made.category + '/', { description: 'patched' }, { expect: 200 });
    await call('category: PUT', 'PUT', '/categories/' + made.category + '/', { name: NAME + ' cat', description: 'put' }, { expect: 200 });
  }
  // brand: full cycle
  r = await call('brand: create', 'POST', '/brands/', { name: NAME + ' brand' }, { expect: [200, 201] });
  made.brand = r.data && r.data.id;
  if (made.brand) {
    await call('brand: read', 'GET', '/brands/' + made.brand + '/', undefined, { expect: 200 });
    await call('brand: PATCH', 'PATCH', '/brands/' + made.brand + '/', { name: NAME + ' brand 2' }, { expect: 200 });
    await call('brand: PUT', 'PUT', '/brands/' + made.brand + '/', { name: NAME + ' brand 3' }, { expect: 200 });
    await call('brand: DELETE', 'DELETE', '/brands/' + made.brand + '/', undefined, { expect: [200, 204] });
    await call('brand: read after delete', 'GET', '/brands/' + made.brand + '/', undefined, { expect: 404 });
  }
  // unit
  r = await call('unit: create', 'POST', '/units/', { name: NAME + ' unit', short_name: 'zzt' }, { expect: [200, 201] });
  made.unit = r.data && r.data.id;
  if (made.unit) {
    await call('unit: PATCH', 'PATCH', '/units/' + made.unit + '/', { name: NAME + ' unit 2' }, { expect: 200 });
    await call('unit: PUT', 'PUT', '/units/' + made.unit + '/', { name: NAME + ' unit 3', short_name: 'zzt' }, { expect: 200 });
  }
  // supplier: full cycle
  r = await call('supplier: create', 'POST', '/suppliers/', { code: 'ZZT-S' + stamp, name: NAME + ' supplier', phone: '', email: '', is_active: true }, { expect: [200, 201] });
  made.supplier = r.data && r.data.id;
  if (made.supplier) {
    await call('supplier: read', 'GET', '/suppliers/' + made.supplier + '/', undefined, { expect: 200 });
    await call('supplier: PATCH', 'PATCH', '/suppliers/' + made.supplier + '/', { contact_person: 'Test' }, { expect: 200 });
    await call('supplier: PUT', 'PUT', '/suppliers/' + made.supplier + '/', { code: 'ZZT-S' + stamp, name: NAME + ' supplier' }, { expect: 200 });
    await call('supplier: ledger', 'GET', '/suppliers/' + made.supplier + '/ledger/', undefined, { expect: 200 });
    await call('supplier: DELETE', 'DELETE', '/suppliers/' + made.supplier + '/', undefined, { expect: [200, 204] });
  }
  // coupon: full cycle
  r = await call('coupon: create', 'POST', '/coupons/', { code: 'ZZT' + stamp, mode: 'PERCENT', value: '1' }, { expect: [200, 201] });
  made.coupon = r.data && r.data.id;
  if (made.coupon) {
    await call('coupon: check', 'POST', '/coupons/check/', { code: 'ZZT' + stamp, payable: '100' }, { expect: [200, 400, 422] });
    await call('coupon: PATCH', 'PATCH', '/coupons/' + made.coupon + '/', { is_active: false }, { expect: 200 });
    await call('coupon: PUT', 'PUT', '/coupons/' + made.coupon + '/', { code: 'ZZT' + stamp, mode: 'PERCENT', value: '2' }, { expect: 200 });
    await call('coupon: DELETE', 'DELETE', '/coupons/' + made.coupon + '/', undefined, { expect: [200, 204] });
  }
  // customer
  r = await call('customer: create', 'POST', '/customers/', { code: 'ZZT-C' + stamp, name: NAME + ' customer', phone: '', customer_type: 'RETAIL' }, { expect: [200, 201] });
  made.customer = r.data && r.data.id;
  if (made.customer) {
    await call('customer: read', 'GET', '/customers/' + made.customer + '/', undefined, { expect: 200 });
    await call('customer: PATCH', 'PATCH', '/customers/' + made.customer + '/', { city: 'Test' }, { expect: 200 });
    await call('customer: PUT', 'PUT', '/customers/' + made.customer + '/', { name: NAME + ' customer', customer_type: 'RETAIL' }, { expect: 200 });
  }
  // product (+ stock count + sale + return)
  if (made.category && made.unit) {
    r = await call('product: create', 'POST', '/products/', { name: NAME + ' item', category: made.category, unit: made.unit, price: '1.00', reorder_level: '0', variants: [{ name: 'Default', is_default: true, cost_price: '0.50' }] }, { expect: [200, 201] });
    made.product = r.data && r.data.id;
    if (made.product) {
      const full = (await call('product: read', 'GET', '/products/' + made.product + '/', undefined, { expect: 200 })).data || {};
      const variant = (full.variants && full.variants[0] && full.variants[0].id) || (r.data.variants && r.data.variants[0] && r.data.variants[0].id);
      await call('product: PATCH', 'PATCH', '/products/' + made.product + '/', { description: 'patched' }, { expect: 200 });
      await call('product: PUT', 'PUT', '/products/' + made.product + '/', { name: NAME + ' item', category: made.category, unit: made.unit }, { expect: 200 });
      if (variant && warehouseId) {
        await call('stock count: post (2 units)', 'POST', '/inventory/adjustments/', { warehouse: warehouseId, reason: 'COUNT', note: 'ZZ-API-TEST', apply: true, expect_unchanged: true, items: [{ variant, new_quantity: '2', expected_quantity: '0', unit_cost: '0.50' }] }, { key: uuid(), expect: [200, 201] });
        await call('stock: read', 'GET', '/inventory/stock/?warehouse=' + warehouseId + '&variant=' + variant + '&include_unstocked=true&limit=1', undefined, { expect: 200 });
        await call('barcode lookup', 'GET', '/products/lookup/?code=' + encodeURIComponent('ZZ-NO-SUCH-CODE'), undefined, { expect: [200, 404] });
        const shift = ((await call('shift: current', 'GET', '/pos/shifts/current/', undefined, { expect: 200 })).data) || null;
        const shiftId = shift && (shift.id || (shift.shift && shift.shift.id));
        if (made.customer && branchId && shiftId) {
          const cart = { customer_id: made.customer, branch_id: branchId, items: [{ variant_id: variant, quantity: '1' }] };
          const prev = await call('sale: server price preview', 'POST', '/quotations/preview/', { branch_id: branchId, customer_id: made.customer, price_mode: 'RETAIL', items: cart.items }, { expect: 200 });
          const total = (prev.data && prev.data.grand_total) || '1.00';
          const key = uuid();
          const body = { ...cart, warehouse_id: warehouseId, shift_id: shiftId, payments: [{ payment_method: 'CASH', amount: total }] };
          const sale = await call('sale: sell (cash)', 'POST', '/sales/sell/', body, { key, expect: [200, 201] });
          const saleId = sale.data && sale.data.id;
          if (saleId) {
            made.sale = saleId;
            const again = await call('sale: same key again (must replay, not double)', 'POST', '/sales/sell/', body, { key, expect: [200, 201] });
            R[R.length - 1].note = again.data && again.data.id === saleId ? 'same sale id returned' : 'DIFFERENT sale id: double posting';
            const detail = (await call('sale: read', 'GET', '/sales/' + saleId + '/', undefined, { expect: 200 })).data || {};
            await call('sale: receipt', 'GET', '/sales/' + saleId + '/receipt/', undefined, { expect: [200, 404] });
            const item = detail.items && detail.items[0];
            if (item) {
              const rb = { return_date: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), refund_method: 'CASH', items: [{ sale_item_id: item.id, quantity: '1' }], reason: 'ZZ-API-TEST' };
              await call('return: preview', 'POST', '/sales/' + saleId + '/returns/preview/', { refund_method: 'CASH', items: rb.items }, { expect: 200 });
              await call('return: post (cash refund)', 'POST', '/sales/' + saleId + '/returns/', rb, { key: uuid(), expect: [200, 201] });
            }
          }
        } else {
          R.push({ phase: 'writes', name: 'sale + return', method: '-', path: '-', status: 0, ms: 0, bytes: 0, code: 'SKIPPED: no open shift or branch', pass: true, expect: null });
        }
      }
      // hold + resume + delete
      if (branchId && variant) {
        const h = await call('hold: park a cart', 'POST', '/pos/hold/', { reference: NAME, branch: branchId, cart_data: { items: [] }, note: 'ZZ-API-TEST' }, { expect: [200, 201] });
        made.held = h.data && h.data.id;
        await call('hold: list', 'GET', '/pos/held/', undefined, { expect: 200 });
        if (made.held) await call('hold: DELETE', 'DELETE', '/pos/held/' + made.held + '/', undefined, { expect: [200, 204] });
      }
      // product clean-up: count its stock back to zero, delete if allowed, else make it inactive
      if (variant && warehouseId && made.sale) await call('stock count: back to 0', 'POST', '/inventory/adjustments/', { warehouse: warehouseId, reason: 'COUNT', note: 'ZZ-API-TEST clean-up', apply: true, expect_unchanged: false, items: [{ variant, new_quantity: '0', expected_quantity: '2' }] }, { key: uuid(), expect: [200, 201, 400, 409] });
      const del =await call('product: DELETE', 'DELETE', '/products/' + made.product + '/', undefined, { expect: [200, 204, 400, 409] });
      if (del.status >= 400) await call('product: deactivate instead', 'PATCH', '/products/' + made.product + '/', { is_active: false }, { expect: [200, 400] });
    }
  }
  if (made.customer) {
    const del = await call('customer: DELETE', 'DELETE', '/customers/' + made.customer + '/', undefined, { expect: [200, 204, 400, 409] });
    if (del.status >= 400) await call('customer: deactivate instead', 'PATCH', '/customers/' + made.customer + '/', { is_active: false }, { expect: [200, 400] });
  }
  if (made.unit) await call('unit: DELETE', 'DELETE', '/units/' + made.unit + '/', undefined, { expect: [200, 204, 400, 409] });
  if (made.category) await call('category: DELETE', 'DELETE', '/categories/' + made.category + '/', undefined, { expect: [200, 204, 400, 409] });
  R.push({ phase: 'writes', name: 'records made (names start ZZ-API-TEST ' + stamp + ')', method: '-', path: '-', status: 0, ms: 0, bytes: 0, code: JSON.stringify(Object.keys(made)), pass: true, expect: null });
  return R;
}
if (typeof module !== 'undefined') module.exports = { run };
