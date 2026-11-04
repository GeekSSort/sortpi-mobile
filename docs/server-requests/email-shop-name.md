# Server request: "Email me my shop name"

Status: **plan only, not built.** The phone team does not change `saas/server`; this is the spec for whoever owns it.
Trello: SQA / Testing > Bugs Reported > "SortPi Mobile | Bug: no way to find the shop name if someone forgets it".

## The problem

A person must type their shop name (`acme` in `acme.sortpi.com`) before they can sign in on the phone. If they forget it there is no way to find it: no endpoint finds a shop from an email address. That is correct for privacy today, but it leaves a new staff member, or an owner on a new phone, stuck on the first screen.

## The idea in one line

A person types their email; if it belongs to a shop, **SortPi emails the shop name to that same address**. Whoever can read the inbox gets the name; nobody else learns anything.

## Why it is safe

- The answer never goes back in the HTTP response. The response is always the same `204`, so it cannot be used to ask "is this person a customer?" (the same rule `ForgotPasswordView` already follows).
- The email goes only to the address that asked, and it carries no secret: a shop name is already public (it is the web address). No code, no token, no reset link.
- Only an active person in an active shop gets mail. Platform staff accounts and inactive shops get nothing.
- Same abuse limits as reset codes (`20/h` per email, `100/h` per IP), because each request sends real mail to a real inbox.

Fact checked in the code: `User.email` is globally unique (`apps/accounts/models.py`), so an address belongs to at most one shop. The mail names one shop. If that ever changes (one person in several shops) the mail should list them all; write the template as a list now.

## API contract

`POST /api/v1/auth/remind-shop` (anonymous, bare platform host)

Request: `{ "email": "name@example.com" }` (the existing `EmailOnlySerializer`).

Responses:
- `204` always, whether or not the address has an account, belongs to staff, or belongs to an inactive shop.
- `400 VALIDATION_ERROR` only when the address is not shaped like an email (same as the reset endpoint).
- `429 THROTTLED` when the limits are hit.

If the request arrives on a tenant host (`acme.sortpi.com`) the person already knows the shop: answer `204` and send nothing.

## The email

Subject: `Your SortPi shop name`

Body (plain words, English and Bangla blocks like the other mails):
- "You asked for your shop name. Your shop is **{company name}**."
- "Open the SortPi app and type this shop name: **{subdomain}**"
- "Or on a computer: https://{subdomain}.{platform domain}"
- "If you did not ask for this, ignore this email. Nobody else can see it."

Not included: the user's name, role, any link that signs in or resets anything, any code.

## Where to change (all under `saas/server`)

1. `apps/accounts/registration_views.py`: add `RemindShopView(_AnonView)` modelled on `ForgotPasswordView` (line ~276), same `throttle_classes = [OtpRequestEmailThrottle, OtpRequestIPThrottle]`, `auth=[]`, 204/400/429 in `extend_schema`.
2. `apps/accounts/registration.py`: add `remind_shop(email, organization_id, request)` next to `request_password_reset`. Rules, in order: normalise the email (`otp.normalize_email`); return if empty; return if the request names a tenant (`organization_id` set); find `User` with `email__iexact`, `is_active=True`, `is_platform_staff=False`, organization `is_active=True`; return if none; queue the mail.
3. `apps/accounts/tasks.py`: new Celery task `send_shop_reminder_email(email, company_name, subdomain)`. Always queue it. If no worker is running, the existing single-process fallback (`otp._dispatch_email` pattern) sends inline, which makes the unknown-address case faster than the known one; see "Timing" below.
4. A mail template beside the OTP one (see how `send_code_email` renders).
5. `apps/accounts/urls.py`: route `auth/remind-shop` (next to `auth/forgot-password`, line ~51).
6. Docs: add the endpoint to `docs/reference/lookup-tables.md` / the accounts PRD; add a `Purpose`-free entry (no purpose needed: there is no code).
7. `make schema` to regenerate `openapi.yaml`; the phone's `npm run gen:api` and the production-spec comparison depend on it.

## Timing

Unknown address and known address must take about the same time, or the endpoint leaks the answer by speed. Do the lookup and the queueing in the same small amount of work either way, and never send mail inside the request when a worker exists. In the single-process fallback, either pad both paths to a fixed floor (for example 300 ms) or accept the leak only for developer setups and say so in a code comment.

## Tests (pytest, like `apps/accounts/tests`)

- Unknown address: 204, no mail.
- Known active user: 204, exactly one mail, to that address, containing the company name and subdomain, containing no digits-only code and no URL with a token.
- Staff address: 204, no mail.
- User of an inactive shop: 204, no mail. Inactive user: 204, no mail.
- Request on a tenant host: 204, no mail.
- Address in different letter case or with spaces: still matches.
- Responses for all the cases above are byte-identical.
- 21st request for the same address in an hour: 429. 101st from one IP: 429.
- Malformed address: 400.

## Rollout

1. Build and test on the server; deploy.
2. Confirm `https://sortpi.com/api/schema/` lists `/api/v1/auth/remind-shop` (the phone team checks the live spec before shipping the screen).
3. Phone work (below) ships after that.

## Phone work (after the server part exists)

- "Forgot the shop name?" help gets a third path: **Email me my shop name** with one email field and a Send button, in `src/app/workspace.tsx`.
- Calls the bare domain with the same client as sign-up (`signupClient(signupBase(...))` in `src/signup`), so it never uses a saved shop.
- Always shows the same message: "If this email has a SortPi shop, we have sent the shop name to it. Check your inbox and spam folder." Never says whether the email was found.
- A 60-second wait before another request; `THROTTLED` says "Too many tries. Wait a few minutes."
- Unit tests for the body, the wait and the messages; emulator check against the local server (mail text read from the server console, as with sign-up codes); Bangla strings.
- Also small and independent of the server: when a typed shop name does not exist, say "We could not find a shop with this name. Check the spelling." instead of "could not reach".

## Open questions for the server owner

1. Should an inactive or suspended shop get the mail anyway (so the person learns the name, then sees "plan is not active")? The plan above says no; it is a one-line change.
2. Should the web login page get the same "Forgot your shop address?" link?
3. Is the platform host the only place this should answer, or also `www`?
