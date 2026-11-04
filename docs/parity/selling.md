# Web inventory: POS till, shifts, counters, sales list, returns, orders, quotations, discount, price check

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report.

## Till gate and shift
- Before selling, the till needs an open shift on a counter: `GET /pos/shifts/current/?counter_id=`; 404 = none. Open with `POST /pos/shifts/open/ {branch_id, opening_cash, counter_id?}` (needs `pos.shift_open`; 0 cash is allowed; "Count the cash in the drawer and enter it").
- Counters: `GET /pos/counters/?branch=&active=1`; each shows Free or In use and who; in-use ones are disabled. A user with `branch.update` and no counters gets "Counter 1" created for them; others are blocked ("no till counter yet").
- Close shift (`pos.shift_close`): count the drawer; live "Exact / Short X / Over X"; note. `POST /pos/shifts/{id}/close/ {counted_cash, note}`. Expected cash = opening float + cash sales + dues collected in cash + cash in - cash out - cash refunds (from `GET /pos/shifts/{id}/summary/`).
- Cash in and out (`finance.manage_accounts`; shop expense also `expense.create`; supplier bill also `supplier.payment`): OUT kinds shop expense, supplier bill, to bank, owner out, staff advance; IN kinds from bank, owner in. Reason required; OUT cannot exceed expected cash. Idempotency-Key.
- Past shifts list with Float, Expected, Counted, Difference. Counters board and detail pages (read-only, `sale.view`).

## Selling rules
- The server prices everything. The client sends variant, quantity (3 dp), optional unit_price (needs `pos.price_override`), optional discount_amount (needs `pos.manual_discount`), payments; never totals. `POST /sales/` with an Idempotency-Key kept per cart until the sale returns; a re-priced retry uses `<key>-repriced`.
- Every scan or tap adds a NEW line (never increments), so one line can carry its own price or discount. Stock is capped per product across lines unless negative stock is allowed.
- Rounding: half-up to 2 dp; `pos.round_to_whole` rounds .40 and above up. Tax inclusive or exclusive per line; order discount shared across lines; VAT rate override with `pos.price_override`.
- Price list: retail, wholesale, or modal (giveaway). A wholesale-type customer switches the sale to wholesale. A product's minimum price blocks payment when the charged price falls below it.
- Order-level fields: discount (flat or %, capped by `pos.max_discount_percent`), coupon (`POST /coupons/check/`), VAT %, shipping or extra charge (reason required when above 0), loyalty points redeem (`redeem_points`), customer, salesperson (trade shops), prescription (pharmacy).
- Selling units (pack, carton): a line carries `unit_id`; qty and price are per pack.
- Serial-tracked items ask for one serial per unit at payment time.
- Scale barcodes: 13 digits with a shop prefix; weight mode or price mode.
- Lookup order for a scan: line already in cart, 30 s cache, scale label, then `GET /products/lookup/?barcode=`; typed codes use `?code=` and return `longer_exists`. Out of stock opens a dialog with substitutes and, with `inventory.adjust`, "Count in and add".

## Payment
- Ways to pay: Pay (cash dialog with Full button, change, part payment only with `pos.allow_partial_payment` and a named customer), Quick Pay (exact cash), Pay Online (brand from `pos.online_payment_methods`, optional TrxID), Multiple payment (split rows; last row absorbs rounding), Credit sale (needs `pos.allow_partial_payment` and a non-walk-in customer; the server enforces the credit limit). Instalment is "coming soon". Over-charge on card or mobile becomes `cash_back`.
- Tender mapping: bKash, Nagad, Rocket, Upay = MOBILE; Card and Card EMI = CARD; Bank transfer and Cheque = BANK; Others = OTHER; cash always offered. Body carries `payment_method` (tender) and `payment_provider` (brand) and `reference_no`.
- Walk-in cannot be part-paid or sold on credit. After success: "Order confirmed" with invoice number and server totals; cart resets.
- Receipts: print only on the web (slip 80 mm or A4); no share, WhatsApp, SMS or PDF anywhere.

## Hold, amend, return
- Hold: `POST /pos/hold/ {reference, branch, customer?, cart_data}`; list `GET /pos/held/`; resume `POST /pos/held/{id}/resume/` returns the cart and deletes the hold; discard `DELETE`. Shared across tills in the branch.
- Amend invoice (`sale.cancel`, sheet layout only): reverses and rewrites under the same number; not allowed after returns or for modal sales.
- Returns: list with filters and cards; new return by invoice number: per-line quantity up to returnable, refund method (Cash, Card, bKash, Bank), reason; preview `POST /sales/{id}/returns/preview/`; submit `POST /sales/{id}/returns/`. Returned value first settles any due on the invoice. If `sales.refund_requires_paid` and a due remains, collect it first. Exchange: `POST /sales/{id}/exchange/` (return lines plus new items plus difference payment). Withdraw a return: `POST /returns/{id}/withdraw/ {reason}`. The web never calls sale cancel.

## Sales list and detail
- List: search (customer, invoice, phone), status (Paid, Partial, Unpaid, Has due, Partly refunded, Refunded, Returned), sale type, date; cards from `GET /sales/totals/`; columns invoice, date, customer, total, received, due, method, status. Actions: view, print, edit invoice, collect payment, refund, withdraw refund. CSV export built in the browser.
- Detail: customer, phone, cashier, branch, method, lines with serials and returned qty, totals, payments list, collect payment with allocation across open invoices (Idempotency-Key).
- A cashier sees only their own sales (`sale.view_own`); `sale.view` sees all.

## Orders and quotations
- Customer orders (`kind=ORDER`): customer must be on file; lines; due date required; deposit (Cash, bKash, Nagad, Card, Bank), mark ready, collect and sell (needs an open shift and the full balance), cancel (reason required; deposit stays as credit). Quotations: customer or typed prospect name, valid until (default +7 days), send to till (parks a held cart), cancel, print.

## Discounts and price check
- Discount screen: set percent or flat offers per product, bulk; percent capped by `pos.max_discount_percent`; edit needs `pos.manual_discount`; offers do not stack with wholesale.
- Price check: scan or type; shows price, offer, MRP, per unit, stock status; "We could not find X. Please ask at the counter."

## Customers at the till
- Add customer: name and phone required; optional email, WhatsApp, type (Retail or Wholesale), group (General, VIP, Corporate, Staff), address, city, tax number, credit limit.

## Unknowns
- Server-side permission codes for sales, hold and shift endpoints; credit-limit rule; Idempotency-Key retention; no offline queue on the web.
