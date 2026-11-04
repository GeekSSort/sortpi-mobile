# Web inventory: shell, session, settings, branches, users and roles, auth, platform console

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report. The full report is kept in the session's tool-results folder; the platform console section past the companies page was not condensed here.

## Session and landing
- `GET /auth/me` carries: id, name, greeting, email, roles, `isOwner` (role "Admin"), `permissions[]`, `home`, `activeBranch`, per-company `features` (stockReport, transactionReset, modal), `currency`, `organization` (name, logo, country), `category` (trade and its feature list), `subscription` (plan, status, limits and usage; null = unmetered).
- Landing (`homeFor`): `dashboard.view` goes to the dashboard; otherwise the first back-office page the user can open; otherwise the till (`/pos`), meaning a cashier-type account with no back office.
- Five seeded roles: Admin (owner), Accountant, Branch Manager, Inventory, Cashier. A cashier typically holds `pos.access`, `product.view`, `inventory.view`, `sale.view_own`.
- Every page is gated by "any one of these permission codes" (some require all). A page with no entry is open on the client and the API is the real lock. The permission catalogue comes from `GET /permissions/`.
- Login errors to word kindly: INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_DISABLED, SUBSCRIPTION_INACTIVE, TENANT_MISMATCH, REALM_MISMATCH, NETWORK_ERROR, THROTTLED. 401 TOKEN_EXPIRED triggers one shared refresh; other 401 or TENANT_MISMATCH signs out; TENANT_INACTIVE shows a closed-company page.
- The tenant comes from the host name (`<company>.<base domain>`), so the phone must carry the company address.

## Shell (header, sidebar, switcher, bell)
- Sidebar sections: Dashboard; Inventory; Stocks; Sales and POS; CRM; Purchases; Warehouse; Finance; Reports; HRM; Roles and Permissions; then General (App Updates desktop only, Branches owner only, Settings `settings.view`, My account, Log out). Items are filtered by permission and by trade feature.
- Branch switcher (needs `branch.view`): `POST /auth/active-branch` returns new tokens; the app reloads. Add branch is offered to everyone, the server refuses with 403; plan limit shows "You are using all N branches".
- Bell: unread count, latest 10 (marks them read on open), "See all". Deep links by event: low_stock, due_reminder, expiry.
- Upgrade dialog: manual payment flow (no card gateway): pick plan, payment method (mobile banking, bank transfer, card), transaction ID required, optional amount, note; a pending request can be cancelled.

## Settings (one form, tabs, one Save; ~35 settings)
- **Company:** logo (PNG, JPG, WEBP, GIF, AVIF, up to 2 MB), name, business type, phone, address, tax ID/BIN, country, currency and symbol (symbol required), email change by 6-digit code. "Clear test transactions" needs `features.transactionReset` plus `settings.update` plus typing the company name.
- **Till and tax:** default VAT rate, max discount at till, "shelf prices include VAT", daily sales target (`sales.daily_target`), allow negative stock, allow typing quantities at the till.
- **POS layout:** wall, express, touch, sheet (saves on tap).
- **Payments:** online payment methods list (bKash, Nagad, Rocket, Upay, Card, Bank transfer, Cheque, Others; at least one needed), allow partial payment, round payable, refund only fully paid invoices, require prescription (pharmacy), surcharge VAT.
- **Customer points:** earn and redeem rules (`loyalty.*`).
- **Coupons:** code, percent or flat, value > 0, active.
- **Invoice layout:** receipt designer, paper width, font size, show/hide toggles, texts, return window days, receipt languages (en, bn, ar).
- **Stock types (units):** name and short name required, allow decimals, default unit.
- **Devices:** printers, drawer, scanner prefix, weighing-scale barcodes; tied to a computer, not relevant to the phone.
- **Plan and billing:** plan name, usage against limits for branches, people, products.

## Branches (owner only)
- List with search and status filter; cards (Active, Warehouses, Switched off, "Plan allows N of M"). Create: code (required, up to 20, uppercased), name (required), phone, email, address; creating also makes the main and transit warehouses. Edit, deactivate (till stops, history stays), activate, delete only if nothing was ever recorded. Till counters per branch: name and code required.

## Users and roles (`role.view` or `user.view`)
- **Users:** list narrowed to the active branch plus company-wide accounts; search; Active/Inactive filter; add user (full name, email required; phone; role; branch or whole company; either "email an invitation" or "set a password" of 8+ characters); change role (replaces all roles); resend invite; deactivate (no reactivate in the UI); hand over ownership (makes the person Admin).
- **Roles:** list with "Built-in" badge; role editor (name required, description, permissions grouped by page, branch scope); delete only non-built-in roles.

## My account
- Change password: current, new, new again (must differ from current); signs out afterwards.

## Discount screen
- Set or remove a discount (percent or flat) per product, in bulk; percent is capped by `pos.max_discount_percent`; edit needs `pos.manual_discount`; page needs `product.update` or `product.update_price`.

## Auth pages
- Login; forgot password (email, then 6-digit code with 60 s resend, then new password of 8+ characters with a letter and a number); accept invitation (uid and token from the emailed link); sign up (3 steps: owner name and email; company name, web address, plan; trade). All send errors like CODE_INVALID, CODE_EXPIRED, TOO_MANY_ATTEMPTS, TICKET_INVALID, INVITATION_INVALID.

## Platform console (SortPi staff only, separate login realm `/platform/auth/*`)
- Dashboard (revenue, trials, companies needing attention), companies (change trade, close, reopen, delete with typed confirmation), subscriptions, invoices, upgrade requests, demo requests, plans, staff, roles, blog. All gated by `tenant.*`, `subscription.*`, `invoice.view`, `lead.view`, `plan.view`, `staff.view`, `role.view`, `content.blog`.
