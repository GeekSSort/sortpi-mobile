# Web inventory: inventory, stock, products

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report.

## Gating (any one code opens the page)
- Products list: `product.create/update/delete/import/update_price/view_cost`. Add products: `product.create`. Edit: `product.update`.
- Categories/brands: `category.*`, `brand.*`. Stock and Add stock: `inventory.adjust`, `.view_movements`, `.view_valuation`. Stock count: `inventory.adjust`. Movements: `inventory.view_movements`. Transfers: `inventory.transfer`, `inventory.receive_transfer`. Warehouses: `warehouse.*`. Labels: `product.update`, `inventory.view` or `purchase.receive`. Cost column and field: `product.view_cost`. Valuation figures: `inventory.view_valuation`.
- Trade features turn pages on per shop type: expiry, mrp, generic, prescription, authenticity, season, refill, serial, multi_unit, tester, modal (free issues), combo, production.

## Products
- **List:** one row per variant. Search (name, SKU, barcode), status filter, sort (newest, oldest, name, most/least stock), summary cards (Total products, Stock value, Low stock, Out of stock). Columns SKU, barcode, name, cost (if allowed), sell, wholesale, min price, in stock, status. Row opens a details modal with a barcode label print (1-200 copies). CSV export. Bulk delete. No category or brand filter on the list.
- **Delete** archives; refused while stock exists unless "entered by mistake" or "write off as a loss" (needs `inventory.adjust`).
- **Scan to add** (camera): found shows "Already in your products" with name, SKU, price, stock; not found shows "Not in your products yet" and "Add it" opening New Items with the barcode filled in. The web's "Open product" link looks broken (points at a route that does not exist), so do not copy it.
- **New items** (spreadsheet-style, or form): SKU (blank generates), name (required), variant, generic name, category (required), unit (required), brand, cost (required, > 0), retail (required, > 0), MRP (retail may not exceed it), wholesale, opening stock, reorder level, barcode (blank generates), image. Same name = one product with variants. Below-cost price asks "Add anyway". Opening stock posts a STOCK_IN. New category/brand/unit can be created inline. No tax field anywhere.
- **Import:** CSV/xlsx/ods, dry run first; required columns name, category, unit.
- **Edit** (one variant plus shared product fields): name, category, brand, unit, description, generic name, search words, DGDA no, prescription, season, made in, importer, refill days, serial tracking, warranty months, reorder level, expiry toggle, discount (% or flat); variant name, SKU, barcode, cost, retail, MRP, wholesale, minimum price, active, picture; selling units for multi-unit trades. Price changes need `product.update_price`.
- **Edit Products** page: finder by name, code or barcode; exact match opens directly (made for hardware scanners).

## Stock operations
- **Stock:** per-warehouse balances with search and level filter; in-row count (lower posts a COUNT adjustment, raise opens Stock in); Stock in needs selling price and a purchase price when there is no earlier cost; Adjust stock by a signed amount (negative = CORRECTION; tester trades add TESTER). Drift guard refuses if the shelf moved (`ADJUSTMENT_STOCK_MOVED`).
- **Add stock:** product, warehouse, quantity, cost (needed when no average cost), date.
- **Stock count:** one warehouse, optional category; type counted per line; "only differences"; scan box adds +1 per Enter (SKU first, then barcode lookup); post confirms net units and value; only changed lines post.
- **Stock report** (ledger with opening, purchase, sales, returns, adjust, closing; Excel/CSV/PDF), **Movements** (ledger list with type and date filters, detail modal, links to source), **Expiry** (batch list, write-off, markdowns), **Free issues** (gifts booked as loss, fabric trade), **Labels** (bulk barcode/shelf-tag print with many sizes, wedge-scan anywhere to add), **Serials** (list, register numbers), **Production and Combos**, **Seasons** (shop-wide markdown).
- **Transfers:** list with status (Draft, Dispatched, Received, Cancelled), add (direction send or receive, lines capped at available, import), dispatch, receive all (no partial receive in the UI though the API supports it), undo dispatch. No cancel in the UI.
- **Warehouses:** list with filters; create (branch, code, type, name, default), edit, activate/deactivate, delete only if it never held stock.
- **Categories and brands:** categories are a tree up to 3 levels; add, rename/move, delete, "delete unused".

## Rules worth copying
- Money 2 decimals, cost 4 decimals, quantity 3 decimals (whole only if the unit disallows fractions).
- Stock-in with no earlier cost is refused (`ADJUSTMENT_COST_REQUIRED`).
- Weighted-average costing; new units inherit the line's average.
- Adjustments carry an Idempotency-Key and `expect_unchanged` with the quantity seen on screen.
