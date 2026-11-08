# Web parity: what the web can do, the phone must do

Rule: the phone drawer uses the web sidebar's group names, order and item names (`src/menu/items.ts`). A web feature is not "done" on the phone until it is in the same place in the drawer, uses the same name, and every call was checked against `saas/server/openapi.yaml` and the live API. Trade-specific modules appear only for shops that have the trade turned on (the web gates them the same way).

## Done (in the drawer today)
Dashboard · Products List · Add Products · Categories & Brands · Stock Levels · Stock Movements · Expiry · POS · Invoice · Return & Refunds · Price Check · Quotations · Customer Orders · Customers · Add Customer · New Purchase · Purchase History · Suppliers · Transfers · Stock Count · Income & Expense · All Reports (6 of 10 sections) · Day Close · Employees · Users & Roles · Activity Log · Settings (part) · Plan & billing.

## Batches, in the order a shop owner needs them
Each batch ends with tests, lint, a Pixel build and a commit.

1. **Reports and HR.** Reports: sales by cashier (`/sales/day-close`, cashier rows), branch performance, running out, stock written off, revenue against cost. HRM: Attendance (`/hrm/attendance/`, check-in/out), Payroll (`/hrm/payroll-runs/`), Shifts (`/pos/shifts/`). Branches (`/branches/`, `/auth/active-branch`).
2. **Finance.** Accounts (`/accounts/`, `/account-transactions/`), Account Transfers (`/account-transfers/`), Vouchers, Regular Payments.
3. **Purchases, warehouse, customers.** Supplier Returns, Old Invoices, Warehouses, Counters (`/pos/counters/`), Price Groups (`/price-groups/`), Refills (`/customers/refills/`), Discount (`/products/discounts/`).
4. **Stock extras.** Free Issues, Serial Numbers, Combo Packs, Seasons, Production, Barcode Labels, Metal Rates.
5. **Trade modules** (only when the shop has them on). Gift Cards (`/gift-cards/`), Instalments (`/instalment-plans/`), Deliveries (`/deliveries/`), Repairs, Trade-ins, Tailoring, Commission.
6. **Settings tabs.** Company, Customer Points, Coupons (`/coupons/`), Invoice Layout (read-only on phone: the phone already prints it), Stock Types, New Items, Printers & Cash Drawer, Barcode Scanner.
7. **App Updates** and **Exchange** (needs its own flow design).

## Not copied
POS layouts, keyboard shortcuts and the customer display window are desktop-only.
