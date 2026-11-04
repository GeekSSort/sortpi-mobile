# Web inventory: dashboard, reports, activity, notifications, finance, HRM

Source: read-only audit of `saas/client/src` (2026-11-03). Condensed from the audit agent's report.

## Gating
- Dashboard `dashboard.view`. Reports: any `report.*`; day close `report.sales`; modal report `report.inventory` plus the shop feature. Activity `audit.view`. Notifications `notification.view` (mark read `notification.update`).
- Income/expense, vouchers, regular payments: `income.view` AND `expense.view`. Transfers and accounts: `account.view` (write `finance.manage_accounts`, new account `account.create`, edit `account.update`).
- HRM `hrm.view`; attendance `hrm.view` or `hrm.attendance`; payroll `hrm.payroll` or `hrm.view_salary`; profile edit `hrm.update`.
- Cost and profit figures need `sale.view_profit` (they show "—" otherwise). A user with no back-office page goes to the till.

## Dashboard (and CEO overview, identical)
- One window filter (All time, Today, Yesterday, 7 days, 30 days, a day, a month, a range); branch comes from the switcher.
- 8 cards: Total sales (net of returns, with change vs the previous same-length period), Sales due, Net profit, Expenses, Purchase (count), Purchase due, Low stock count, Out-of-stock count. Taps open a panel or a page.
- Sales summary bar chart (7 days, 30 days, 6 months, 12 months) split into profit and cost, expenses below the line. Customers card (total, new this month, today). Top 5 selling products, low stock list, top 3 customers, "Today target" bar against the `sales.daily_target` setting, recent sales table (10 per page).
- Panels degrade on their own when a permission is missing.

## Reports
- Filters: sale type (All, Wholesale, Retail), period, branch. 4 cards (Revenue, Cost of goods, Gross profit, Units sold) and 10 report cards: revenue against cost by day, sales by cashier, payments by method, revenue by category, top products and variants, branch performance, profit and loss, customer dues, running out, stock written off. Each exports a CSV built in the browser.
- **Day close (Z report):** pick a day; sales, returns, net, discounts, VAT, paid, left on credit; by payment method; by cashier; drawer table (float, expected, counted, difference); warns if shifts are still open. Prints on A4. Needs `report.sales`.
- **Modal giveaways:** free goods given at the till; server exports CSV/Excel/PDF; cost columns need `inventory.view_valuation`. Only for fabric-type shops.
- **Activity (audit log):** filter by 9 actions (sale cancelled/returned, stock adjusted, negative stock allowed, login, login failed, account locked, password changed, user created) and date; cards for today's records, sign-ins, failed sign-ins in 7 days, stock adjusted in 7 days.
- **Notifications:** newest first, 50 per page, All or Unread; tap marks read and opens the matching page (low stock, due reminder, expiry); "Mark all as read".

## Finance
- **Income and expense:** yearly matrix or monthly list; cards (income, transactions, expense, net balance); trend chart; add entry (type, category required, amount > 0, date, note, inline new category); edit and delete only for manual entries (sales and returns link out); CSV export.
- **Vouchers:** numbered income or expense documents with cards, filters, a printable receipt, new voucher (type, category, amount, date, paid from or received into, note; "Save & print"), void (number not reused), category manager.
- **Regular payments:** recurring rent, salaries, bills; weekly, monthly, quarterly, yearly; due prompt on load ("Did you pay this bill?" Yes paid / No, not paid); pay now, pay skipped, history, edit, pause, remove; each payment writes a voucher.
- **Account transfers:** from, to (must differ), amount, date, reference (max 50), note; warns but does not block if the amount exceeds the balance; void reverses it.
- **Chart of accounts:** list grouped by kind with balances; new account (code max 20 and kind are fixed after creation); ledger per account with running balance.

## HRM
- **Employees:** cards (working, present today, absent or on leave, monthly wage bill), search, status filter, add (name, email, department, designation required; basic salary, allowances, deductions, commission % only with `hrm.view_salary`), edit, mark as left or rejoined, delete (refused once anyone was paid). Plan limit can refuse with `PLAN_LIMIT_REACHED`. The photo is not saved by the web.
- **Profile:** job and pay panel, 30-day attendance strip, payslips with proof, leave list (read only; the web has no leave apply or approve).
- **Attendance:** day view with check in and check out (always posts today's date), monthly sheet per person, print.
- **Payroll:** month navigator, run payroll for a period (a payslip per active employee), pay salary (method Cash, Bank, Mobile banking, Cheque; reference required unless cash; paid from account), mark all as paid (cash only; inconsistent with the per-row dialog), edit figures while the run is a draft, upload proof (JPEG, PNG, WebP, PDF, max 5 MB), edit payment details, undo payment (reason required), print salary slip.

## Notes for the phone
- All of these have a per-card or per-page window filter; the phone needs a compact version of that filter.
- CSV exports and print windows on the web would become share sheets on the phone.
