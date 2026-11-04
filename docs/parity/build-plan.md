# Build plan: the web's full-admin features on the phone

Written 2026-11-04 after a read-only walk through every page of a live shop (47 menu pages, 12 Settings sections, the Roles tab).
Web page names below are the ones in the web menu. Phone = `mobile/SortPi`.

## What "production APIs" means here
The phone already talks to the real SaaS API: the shop name picks the server (`https://<shop>.sortpi.com/api/v1`), the same one the web uses. So "implementing production APIs" = wiring each web feature to its real endpoint in the app, one slice at a time. Nothing is mocked.

## How every slice is built (the same eight steps)
1. **Read the contract.** Find the endpoint, its fields, errors and the permission code in `saas/server/openapi.yaml` and the web page that uses it. Read only.
2. **Check it live.** A read-only GET against the local dev server (and, once the user is signed in, the real shop on screen) to confirm real shapes, empty states and what each role gets back. Fields only some roles get (cost, profit) are never shown to others.
3. **Pure logic first, with tests** (`node --test`): ranges, states, money maths, request bodies. Money stays a string; the server prices everything.
4. **API module** `src/<area>/api.ts`, typed, one function per endpoint. Every money-moving call carries an `Idempotency-Key`, one per attempt.
5. **Screens** from the pieces that exist: header, tiles that are also filters, list with skeleton / error / empty states, bottom sheets for choices, a toast with Undo, a confirm before anything that cannot be undone.
6. **Plain Bangla and the colour code** (green money in or fine, red owed or finished, orange running low, blue go), an icon beside every colour, 48 dp targets.
7. **Check on a device**: normal and largest text, Bangla, dark, one failure and its recovery. Write down what was not seen.
8. **Trello comment, parity doc updated**, nothing committed.

Where a write flow needs testing it runs on the local dev server, never on the real shop's data.

## Order (value to a shop, smallest first)
| # | Slice | What the shopkeeper can do | Web pages it matches |
|---|---|---|---|
| 0 | **Sales list and sale detail** (code written, tests pass, not yet seen on a device) | Find any sale by invoice, name or phone, by period; see items, payments, what is owed; share the receipt | Invoice |
| 1 | **Returns and refunds** | From a sale: pick items and quantities, see the refund the server works out, choose how to give it back | Return & Refunds |
| 2 | **Money in and out** | Write an expense or income voucher in a few taps, see today's and the month's balance; categories | Income & Expense, Vouchers |
| 3 | **Suppliers and purchases** | Suppliers with what is owed; a new purchase by scanning goods (saved as a draft, then confirmed and received, as the web does); pay a supplier; send goods back | Suppliers, New Purchase, Purchase History, Supplier Returns, Old Invoices |
| 4 | **Stock work by scan** | Count shelves by camera and post the count; see stock movements; receive a transfer; **expiry list (30-day filter) for pharmacies** | Stock Count, Stock Movements, Transfers, Expiry |
| 5 | **Products: manage** | Product list and detail, change a price, categories and brands, offers (Discount), share barcode or QR labels | Products List, Edit Products, Categories, Brands, Discount, Barcode Labels |
| 6 | **Till gaps** | Pick the counter when opening the day (the web asks, the phone does not), hold and resume a cart, price check by scan, coupon and customer points when the shop uses them | POS, Counters, Shifts, Price Check, Settings: Till, Coupons, Points |
| 7 | **Reports and the day report** | Today / week / month figures, top products, dues, profit only for people who may see cost; the Z report shared as text or PDF | All Reports, Day Close |
| 8 | **Orders and quotations** (trade-specific, shown only if the shop uses them) | Customer orders with deposit and collect date; quotations; tailoring | Customer Orders, Quotations, Tailoring |
| 9 | **People and admin, read first** | Staff list, attendance by tap, payroll view, users and roles, branches, activity log, plan and limits, change password | Employees, Attendance, Payroll, Users & Roles, Branches, Activity Log, Plan & billing, Account |
| 10 | **Settings essentials** | Daily target, payment methods, stock types, default VAT | Settings (Till & tax, Payments, Stock types) |

Not on the phone on purpose: invoice and label designers, POS layout choices, printer and cash-drawer setup, desktop scanner settings (they belong to a computer).

## What I need from you
1. **Order.** The list above is my recommendation. If most of your customers are pharmacies like the shop you gave me, move slice 4 (expiry) up.
2. **Real-shop checks.** I cannot type a password into a login form. Sign in yourself on the emulator or phone and I will read screens only; nothing is created on the real shop. The shop is empty, so real data shapes come from the local dev server.
3. **Pixel.** It needs a new native install (`npx expo run:android --device <pixel>`) to get predictive Back and the cleaned package list.

## Navigation: no hidden drawer, a grouped "everything" page
The phone keeps 5 bottom tabs (Home, Sell, Stock, Customers, More). The 40-plus web pages do not go in a side drawer:
- **Discoverability.** A drawer hides every feature behind a hamburger; people who are not used to apps do not open it. A menu page shows everything at once, with pictures and colour.
- **Back gesture clash.** On Android the left-edge swipe is the system Back gesture (predictive Back is now on), and a drawer wants the same swipe. iOS has no drawer pattern at all.
- **Instead:** the **More** tab becomes a grouped menu page, each row a coloured icon, a plain Bangla name and a one-line hint, shown only for what the person's role allows (and only for trades the shop uses): **Sell** (Sales, Returns, Price check, Orders), **Stock** (Products, Expiry, Count, Transfers, Movements, Offers, Labels), **People** (Customers, Suppliers, Staff), **Money** (Expenses, Purchases, Reports, Day report), **Shop** (Branches, Users and roles, Activity, Settings, Plan). A search box at the top finds a feature by name. Language, text size, screen colours, help and sign out move to the bottom of the same page.
- **Daily jobs stay one tap away:** the four most used get tiles on Home, and each new feature screen is also reachable from where it belongs (Sales from "Sold today", Returns from a sale, Expiry from the low-stock tile).
- Built as slice 0.5, before slice 1, so every later slice has a place to appear.
