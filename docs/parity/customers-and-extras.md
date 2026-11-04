# Web inventory: customers and sales extras

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report.

## Gating
- `/customers`, `/customers/refills`: `customer.view`. Customer add and detail inherit it.
- Sales extras list pages (repairs, instalments, trade-ins, deliveries, commission, tailoring): `sale.view`. New repair and tailoring: `sale.create`.
- Trade features switch pages on per org: `repair`, `instalment` (also trade-ins), `delivery`, `tailoring`, `commission`, `refill`. Customers are never feature-gated.
- Other codes seen: `customer.create` (import), `customer.update` (mark contacted), `customer.payment` (collect instalment, collect on sale), `sale.cancel`, `sale.refund`, `inventory.adjust` (Free Modals card).
- No customer delete anywhere on the web. No customer ledger or statement page either.

## Customers
- **List:** cards (Total, With due, Total receivable, New this month from `GET /customers/summary/`); search (name, code, exact phone); filters status, type (Retail/Wholesale), "Owes money"; rows show code, name, phone, type, orders, total, paid, due, status; infinite scroll, 25 per page.
- **Row actions:** open, quick profile, edit, record payment. Import (CSV/xlsx, dry run first) and export (CSV) are desktop-style tools.
- **Add:** name (required), type (Regular/VIP/Premium; Premium = WHOLESALE, others RETAIL), phone, credit limit (empty = shop default). Always active. `POST /customers/`.
- **Edit:** name (required), phone, email, type, credit limit (empty sends 0 = clears limit). `PATCH /customers/{id}/`.
- **Detail:** header with credit line ("limit X, Y available"), cards Total purchases, Total paid, Outstanding, Last purchase; invoices table (invoice, date, branch, total, still owed, Paid/Part paid/Unpaid); Free Modals section only with the feature and `inventory.adjust`.
- **Record payment:** amount required, > 0, capped at what is owed; paid by Cash/Card/Bank/Mobile banking/Other; note; allocation lines oldest first (auto-spread, editable, cannot exceed amount); rest stays on account. `POST /customers/{id}/payments/` with `amount`, `reference_type: "PAYMENT"`, `note`, `payment_method`, optional `allocations[{sale_id, amount}]`, header `Idempotency-Key`. Response has `balance_after`.
- **Refills** (feature `refill`): due-within filter 3/7/14/30, contacted filter, cards, WhatsApp (`wa.me`, 11-digit 0xxxxxxxxxx gets 88 prefix) and call links, "Mark contacted" (`POST /customers/refills/contacted/`).

## Sales extras
- **Deliveries** (feature `delivery`): list with status Packed / With the rider / Delivered / Came back; created from a sale ("Send for delivery": address required, phone, rider, vehicle). Steps PENDING to OUT to DELIVERED or FAILED (`POST /deliveries/{id}/step/`, cash collected on delivery). Challan prints from the browser.
- **Instalments** (feature `instalment`): plans over a sale's remaining due (months 2-36, first due date). List with overdue filter. Collect instalment needs `customer.payment` (`POST /instalment-plans/{id}/collect/`, Idempotency-Key).
- **Trade-ins** (feature `instalment`): customer, device, IMEI, agreed value, condition; the value goes on the customer's account and the device into stock. List only.
- **Repairs** (feature `repair`) and **Tailoring** (feature `tailoring`): one service, `customer-orders`, kinds REPAIR and TAILORING. Stages, advance deposit (`/deposit/`), mark ready, deliver and bill (`/collect/`, needs an open shift), return/cancel with reason. Tailoring adds garment, cloth, trial and delivery dates, 8 measurements, prefilled from the customer's last order.
- **Commission** (feature `commission`): read-only report by date range: salesperson, sales, net sales, rate, commission.

## Notes for the phone
- Money is sent as 2-decimal strings; payments carry an Idempotency-Key minted when the dialog opens.
- Receipts, challans and slips on the web are browser print windows, so the phone needs share or PDF instead.
- Server-side permission codes for create/edit customer were not visible in the web source.
