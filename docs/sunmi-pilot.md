# SUNMI pilot

Record the exact model code, SUNMI OS and printer-service versions, scanner output modes, display variant and APK version for every test unit. Use a test shop and two pilot terminals before expanding the group.

| Phase | Hardware | Run on the terminal |
| --- | --- | --- |
| 1 | V3 T5F1A with scan engine and side buttons | Confirm 58mm detection, test print, sale receipt and reprint. Scan numeric, short and letters-only codes with the search field unfocused. Enable keyboard plus broadcast output and confirm one cart action per decode in both arrival orders. Test repeated scans, camera fallback and switching away from Sell. |
| 1 | D3 MINI 80mm T1730/T1731 with the chosen customer display | Test Product wall, Express checkout, Touch POS and Spreadsheet till in landscape. Confirm 80mm detection, alignment, cutter and second-screen basket updates. Rotate, disconnect and reconnect the display, leave checkout and background the app. Confirm the old basket clears. |
| 2 | D3 80MM and T3 PRO MAX | Repeat counter checks on each exact printer and secondary-display configuration before adding that model to the group. |

On both pilot units, check Bangla text, logo and barcode readability, a multi-page receipt, paper-out recovery and reprint. On units that report cover state, open the cover and verify the recovery message. Confirm Android printing still opens for a Wi-Fi printer on a regular Android phone and on a SUNMI terminal with the Android printing switch enabled.

## Private distribution

1. Set the **sunmi-pilot** GitHub environment secrets **ANDROID_RELEASE_KEYSTORE_BASE64**, **ANDROID_RELEASE_STORE_PASSWORD**, **ANDROID_RELEASE_KEY_ALIAS** and **ANDROID_RELEASE_KEY_PASSWORD**. Use the established release key for **com.geekssort.sortpi** if one exists. Keep the Firebase config available through **GOOGLE_SERVICES_JSON**.
2. Run the **SUNMI private pilot APK** workflow with a version code greater than the deployed pilot. Verify its APK signer fingerprint against the approved release certificate. A debug-signed install and production-signed install with the same package cannot upgrade over one another.
3. In SUNMI Partner Platform, select the private app distribution path and a device group containing only the two pilot units. Upload the verified APK and confirm the chosen package, version and target group before publishing to that group.
4. Verify installation, upgrade and the test matrix on both units before adding D3 80MM and T3 PRO MAX.

[SUNMI Partner Platform](https://partner.sunmi.com/) · [SUNMI device management](https://www.sunmi.com/en/partner/) · [SUNMI USB debugging](https://docs.sunmi.com/en-US/cdixeghjk491/xdrzeghjk557)
