# Web inventory: purchasing and suppliers

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report.

## Gating
- View pages: `purchase.view`. New purchase and old invoice: `purchase.create`. Supplier pages: `supplier.view`.
- Actions: `purchase.update` (edit), `purchase.confirm`, `purchase.receive`, `purchase.payment`, `purchase.return`, `purchase.delete` (cancel, void, delete).
- Supplier create/edit/pay have no UI check; the server decides (`supplier.payment` seen only in the POS cash drawer).

## Purchase status
DRAFT (owes nothing, no stock) → CONFIRMED "Ordered" (supplier now owed, no stock) → PARTIAL → RECEIVED. CANCELLED from DRAFT or CONFIRMED only, never after anything is received. Payments are refused on a draft. Payment status (Paid / Partial / Due) is worked out from the due amount.

## Screens and actions
- **Purchases list:** cards (Total purchases, Orders, Paid, Due to suppliers); search, type (Orders / Old invoices), status, date presets; row actions view, edit, payment history, print, confirm, receive, record payment, cancel, delete. CSV export and spreadsheet import (creates a draft).
- **Add purchase:** supplier (required, active only), date (default today), supplier invoice no; warehouse is the active branch's first warehouse; lines by variant (same variant cannot repeat) with qty, unit cost (4 decimals), retail and wholesale price (written back to the catalogue), tax %, per-line unit when bought by the carton; note; payment method and optional advance; "On credit". Outcomes: draft; confirm (credit); confirm and pay an advance. `Idempotency-Key` per form. A below-cost price asks "Save anyway".
- **Scanner on web:** a "Product code" box that adds the exact SKU or barcode match (+1 on a repeat scan). No camera scanning and no receive-by-scan on the web.
- **Receive:** all outstanding goods at once; the API supports per-line quantities and serials, the web only sends serials as typed text.
- **Return to supplier:** from the purchase page; only received-minus-returned can go back; reason optional; credit preview before tax.
- **Pay:** per order (`/purchases/{id}/payments/`) or on the supplier's account (`/suppliers/{id}/payments/`, no allocation to an order, Idempotency-Key required).
- **Old invoice:** supplier bill from before SortPi; posts immediately; answers "add goods to stock?" and "was it paid?"; can be voided with a reason unless paid or returned in SortPi.
- **Edit purchase:** draft or confirmed only: supplier, date, invoice no, line quantities and costs, remove lines (cannot add lines). After receive, only the invoice no.
- **Payments history** (per order and across all orders), **returns list**, **suppliers list** (cards, search, status, edit, activate/deactivate, archive, record payment, CSV), **add supplier** (name and phone required, email, VAT/BIN), **supplier detail** (cards, statement ledger oldest first, that branch's purchases).

## Rules worth copying
- Money as 2-decimal strings, quantity 3 decimals, unit cost 4 decimals, tax as a fraction string. The server recomputes all totals; the client only previews.
- Payment boxes clamp to what is due, with a Max button.
- Receipts and PO slips are browser print windows; the phone needs share or PDF.
