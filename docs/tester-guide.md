# SortPi phone app: tester guide

For the team trying the app through Firebase App Distribution. Android only for now.

## Install

1. Open the invite email on the phone, tap **Get started**, then install the **App Tester** app when asked.
2. In App Tester, tap **Download** on SortPi. Allow "install unknown apps" for App Tester if Android asks.
3. First time only: pick **বাংলা** or English, type the **shop name** (the part before `.sortpi.com`, for example `acme-traders`), then sign in with your email and password.

The app talks to `https://<shop>.sortpi.com`. It needs an internet connection.

## Opening a new account

On the shop-name screen, tap **No shop yet? Open a free account**. Five steps: your shop and what it sells, you and your email, a plan, the six-digit code we email you, and a password. Nothing is charged. **A shop made this way is a real shop on sortpi.com**, so testers should use clearly fake names (for example `test-yourname`) and tell the team so the test shops can be removed from the console.

If you forget the shop name, tap **Forgot the shop name?** on the same screen. Owners can send the name to staff from **More > Shop settings > Shop details > Send it to my staff**.

## Use a test shop

The app reads and **writes real data** in whichever shop you sign in to: sales, stock, customers, settings. Use a demo or test shop, not a live one, unless you mean to make real changes. Sales cannot be deleted once made.

## What is in this build

Sell (scan or search, discounts, coupons, customer points, split payments, credit, hold and resume), products and stock (add, edit, count, adjust, expiry, movements, transfers between branches), customers and suppliers (accounts, payments), purchases, orders, reports and day close, team and roles, shop settings (VAT, discounts, ways to pay, stock types, customer points, coupons, shop details and logo), and **Your plan** (More > People): your SortPi plan, what you use, and how to ask for a bigger plan. Nothing is charged in the app; you pay SortPi first and then send the payment details.

## Please check especially

- Words in **Bangla**: anything cut off, wrong, or still in English.
- **Big text** (Android Settings > Display > Font size) and **dark mode**: nothing overlapping or unreadable.
- **A role that is not the owner** (cashier, manager): screens should hide what that role may not do, and show a clear message if it still happens.
- **Bad network**: switch to airplane mode mid-action. The app should say what happened and let you try again, and never make the same sale twice.
- **Scanning** real barcodes and QR codes with the camera.

## Not in this build

SortPi's own bills (invoices) for your plan, company email change, receipt and invoice design, till screen layout, weighing-scale and scanner setup, importing transfer lines from a file, asking another branch for goods (the server has no such request), offline selling, iPhone.

## Reporting a problem

Send: what you did, what you expected, what happened, the phone model and Android version, the shop name, and a screenshot or screen recording. If the app shows a request number (REQ-…), include it.

---

## For whoever uploads builds (not for testers)

- Build: `cd android && NODE_ENV=production ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a`, then take `android/app/build/outputs/apk/release/app-release.apk` (about 50 MB; without the architectures flag it is 130 MB because it carries code for four chip types, two of which only emulators on Intel PCs use). A release build only talks to `https` shops: plain-`http` addresses such as a local dev server are blocked, so test those with a debug build (`npx expo run:android`). The `android/` folder is generated from `app.json`; never edit it by hand (`npx expo prebuild --platform android` rebuilds it).
- Raise `android.versionCode` in `app.json` for every upload (Firebase and Android refuse an install that is not newer).
- This build is signed with the standard Android **debug** key. That is fine for internal testing (every build has the same signature, so testers can update in place). **Before the Play Store**, make a real upload keystore and keep it safe; builds signed with a different key cannot update an installed app.
- Upload in the Firebase console (App Distribution > Releases), or: `firebase appdistribution:distribute app-release.apk --app <FIREBASE_ANDROID_APP_ID> --groups "<group>" --release-notes "<what changed>"`. The Firebase Android app must use package name `com.geekssort.sortpi`.
- No Firebase SDK is inside the app; App Distribution does not need one.
- iPhone builds need an Apple distribution profile and device registration (bundle id `com.geekssort.sortpi.mobile`, team `622QE445GT`); not done.
