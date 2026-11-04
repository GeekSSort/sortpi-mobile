# Release flow: feature branch to Play Store

```
feature branch ──PR──> dev ──PR──> staging ──PR──> main
                        │            │              │
                   checks only   checks + BUILD   Play Store
                   (no build)    + Firebase "team" (not built by CI yet)
```

| Branch | What CI does | Who gets it |
|---|---|---|
| any pull request, `dev` | `.github/workflows/ci.yml`: typecheck, unit tests, lint (lint does not block yet) | nobody, no build |
| `staging` | `.github/workflows/staging.yml`: checks, then builds the release APK and uploads it to Firebase App Distribution, group **team** | the testers in `team` (they get an email) |
| `main` | nothing yet | Play Store: see below |

Only `staging` builds. Merging into `dev` is cheap and silent; merging `dev` into `staging` is the act of sending a build to testers.

## One-time setup (done by a person, GitHub and Google consoles)

1. Create the branches `dev` and `staging` on GitHub from `main`. Protect `staging` and `main` (pull request required, checks must pass).
2. Firebase: project `sortpi-mobile`, Android app `com.geekssort.sortpi`, tester group `team`. App ID: `1:608423664394:android:cdc4952ddc3a1e60c878f3`.
3. Google Cloud console, project `sortpi-mobile`: create a service account, give it the role **Firebase App Distribution Admin**, make a JSON key.
4. GitHub, repository Settings, Secrets and variables, Actions: add
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the whole JSON key file, pasted as text
   - `FIREBASE_APP_ID`: the app ID above
5. Delete the downloaded key file from the computer. Never commit it.

The version code of every staging build is the GitHub run number (set in the workflow), so each upload is newer than the last.

## Play Store (not built yet)

`main` is meant to ship to Google Play. It needs things only the owner can make, so the workflow is not written yet:

- A Play Console account and the app created with package `com.geekssort.sortpi`.
- A real **upload keystore** (the staging builds use the standard debug key, which Play will not take). Keep a backup: a lost upload key is a long support case.
- A Play service account JSON, and the keystore, as repository secrets.
- The build is an **AAB** (`bundleRelease`), pushed to the **internal testing** track first; promote to production by hand in the Play Console.

Raise `versionCode` for every upload (CI does it from the run number).

## Local build, as a fallback

See `docs/tester-guide.md`, "For whoever uploads builds".
