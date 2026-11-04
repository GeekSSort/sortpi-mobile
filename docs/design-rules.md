# SortPi design rules

Built from Apple's Human Interface Guidelines, Google's Material Design 3 and Samsung One UI, and from who uses the app: shop owners and staff of small stores, any age, often reading little. Every new screen is checked against this list.

## See it
1. **Contrast.** Text is at least 4.5 to 1 against its background in both light and dark (3 to 1 for large text and icons). `src/constants/contrast.test.ts` checks the colour tokens, so a bad colour fails the tests.
2. **Colour is never alone.** Green means money going through or fine, red means owed, finished or a problem, orange means running low, blue means go somewhere. An icon or a word always sits beside the colour.
3. **Text size.** Body text is 16. The phone's own font size is respected, and More has Normal / Large / Extra large. Nothing important is cut off; it wraps.
4. **One main thing per screen.** One big primary button; the rest is quieter. Advanced fields sit under "More details".

## Reach it
5. **Touch targets are at least 48 dp**, with space between them. Chips, buttons, inputs and rows all follow this.
6. **Thumb zone.** The main action sits in the lower half of the screen (Take payment, Save this item, Close the day). Titles and information sit at the top.
7. **No gesture-only actions.** Everything done with a swipe or a long press can also be done with a visible button.

## Understand it
8. **Everyday words, in the shopkeeper's language.** Bangla first. No jargon (no SKU, MRP, shift, float without a plain explanation). Short sentences. "You buy at / You sell at", not "cost / retail".
9. **Recognition, not memory.** Defaults and last choices are remembered (unit Piece, last category, language). Choices have pictures and colours.
10. **Say what is happening.** Loading shows placeholders, not an empty screen. A finished action says so ("Sale complete", "Payment recorded"). A failed one says what went wrong and what to do next.
11. **Same thing, same look.** The same icon, colour and word everywhere. Native header and back arrow, bottom sheets for choices, system icons: the patterns the phone's own apps use.

## Trust it
12. **Ask before anything that cannot be undone** (sign out, remove everything, close the day). Money calls are safe to retry: one key per attempt, so a dropped connection cannot charge twice.
13. **Plain errors.** Never a code or "undefined". Network trouble says "No connection. Check your internet and try again."
14. **Respect permissions.** A person only sees what they may do; hiding a button is convenience, the server is the lock.

## Access it
15. **Screen reader.** Every icon-only button has a label; buttons, selected states and alerts have roles.
16. **Keyboard.** The right keyboard for the field (numbers for prices and phones), autofill where it helps, a submit key that moves on.
17. **Dark mode and system settings** are followed.

## Checked so far (2026-11-04)
- Done and tested: contrast of all colour pairs (rule 1), 48 dp on chips, scan button and inputs (5), confirmations before clear cart, close the day and sign out (12), plain error words (13), colour code with icons (2), text size setting (3), Bangla (8).
- Done, seen on the Pixel: top-of-screen information and bottom-of-screen main actions on Add item and Sell (6), native headers (11).
- Not yet checked: screen reader walk-through with TalkBack (15), every field's keyboard type (16), swipe-only actions (none exist today) (7), a session with a real shop owner.

## Decisions kept on purpose (audit, 2026-11-04)
- **Portrait only.** A shop till is held upright and the camera strip and pay bar are designed for it. Wide screens still get a centred column (800 dp for pages, 640 dp for sheets, 560 dp for toasts) instead of stretched rows.
- **Static brand palette, no Material You colours.** The colour code (green money, red owed, orange low) must look the same on every phone, so it does not follow the wallpaper.
- **Predictive Back is on** (`predictiveBackGestureEnabled`). It only takes effect in a new native build, so check Back on a fresh build.

## Verified on an emulator (2026-11-04)
A fresh native build on an Android 17 emulator (Pixel 9a image) after the audit fixes:
- **Screen reader labels:** Android's accessibility tree on Home, Sell, Stock, Customers and More reads Bangla. Customer rows now say "বাকি" for an amount owed (colour alone is not a signal).
- **Large text (SortPi "Extra large" with the phone at 1.3):** tiles stack their icon above the label and wrap, the camera-permission box grows, the header link is capped, inputs scale their line height. The pay bar stays usable.
- **Predictive Back:** on in the built manifest; the edge-swipe Back gesture pops a screen and closes a sheet.
- **Wide screen (about 914 dp wide):** pages, pay bar and sheets stay in a centred column. Bottom tabs stay at the bottom (no navigation rail).
- **Press feedback:** rounded tiles dim while pressed (Android's ripple spills past rounded corners, so it is not used on them).
- Not heard: actual TalkBack speech (the emulator was not put in TalkBack mode; the labels it would speak were read from the accessibility tree).
- Dev-build only: changing the phone's font or display size pops a LogBox "linking configured in multiple places" warning. It comes from Android recreating the screen under the dev client.
