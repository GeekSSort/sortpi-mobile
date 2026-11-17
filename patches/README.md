# Patches

Changes to packages in `node_modules`, kept with `patch-package`. `npm install` and `npm ci` apply them (`postinstall`), so CI and every developer get the same code.

## `expo-camera+58.0.14.patch` (issue #59)

Gives the live camera preview two things the stock `CameraView` lacks:

- **Auto-zoom.** `BarcodeAnalyzer.kt` hands ML Kit a `ZoomSuggestionOptions`. When a barcode is too small or far to read, ML Kit asks for a zoom ratio and `ExpoCameraView.kt` applies it with CameraX `setZoomRatio`, clamped to the phone's real zoom range and to 5x at most. A camera that reports no zoom range stays at 1x; the front camera runs the same code with its own range.
- **Tap to focus.** A tap on the preview focuses and meters exposure at that point (`startFocusAndMetering`, back to continuous focus after 3 s).

Nothing else about the preview changes. The JavaScript side (`src/scan/scanner.tsx`) is untouched by the patch.

### Why `buildFromSource`

Expo ships `expo-camera` as a precompiled library, so a source patch does nothing by itself. `package.json` lists it under `expo.autolinking.android.buildFromSource`, which makes Gradle compile it from `node_modules`. This makes the Android build a little slower.

### After upgrading `expo-camera`

The patch name carries the version it was made for. After a version change:

1. Run `npm install`. patch-package prints `expo-camera@<version> ✔` when it applies. If it says the version differs or a hunk failed, the patch needs to be made again (steps 2 to 4).
2. Reinstall a clean copy (`rm -rf node_modules/expo-camera && npm install expo-camera`), then redo the two edits above by hand in `android/src/main/java/expo/modules/camera/`: `analyzers/BarcodeAnalyzer.kt` and `ExpoCameraView.kt`. Check that the ML Kit and CameraX versions in the new `expo-camera` still offer `ZoomSuggestionOptions` and `cameraControl.setZoomRatio`.
3. Make the patch again and leave out build folders:
   `npx patch-package expo-camera --exclude 'android/(\.gradle|build)/'`
   then delete the old `expo-camera+<old version>.patch`.
4. Build a release APK and try it on a real phone: hold a small barcode at arm's length and bring it closer (the view should zoom in by itself until the code reads), tap the preview on a blurry code (it should refocus there), and flip between the front and back camera a few times (it must not go black).
5. Check the staging build in CI succeeds, since it compiles `expo-camera` from source.

If the upgrade makes this patch unnecessary (the library gains auto-zoom and tap to focus), delete the patch, the `postinstall` line if nothing else uses it, and the `buildFromSource` entry.
