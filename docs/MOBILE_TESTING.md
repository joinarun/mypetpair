# Mobile testing builds

The Android APK is distributed as an asset on the private [GitHub mobile testing release](https://github.com/joinarun/mypetpair/releases/tag/v1.1.0-test.1). Sign in to GitHub with repository access to download it. It embeds the app's JavaScript bundle and uses the live API at `https://mypetpair-248924650823.us-central1.run.app`. A Metro development server is not required. Registration is open, requires mobile and CAPTCHA, and defers email/mobile verification to phase 2. Credentials are never bundled.

## Android

Download `MyPetPair-1.1.0-android-test.apk` (about 51 MiB) to an Android device and open it. It supports Android 7.0/API 24 and newer. Android may require permission for the browser/file manager to install this downloaded APK. This is an internal testing build, signed with the generated Android test key, not a Play Store release. It includes ARM64 and x86_64 native libraries. Do not use this signing key for a public release; a future production signing identity may require uninstalling this test app before installing that release.

With Android platform tools and USB debugging configured, install using:

```bash
adb install -r MyPetPair-1.1.0-android-test.apk
```

iOS testing was explicitly deferred by the product owner for this release.

## Rebuild locally

Run `npm ci` in `frontend`. The build scripts use Expo Continuous Native Generation; generated `android/` and `ios/` folders stay ignored. Local prerequisites are Node 24, Java 21 and the Android SDK. Android dependencies include platform 37.0, build tools 37.0.0 and 36.0.0, NDK 27.1.12297006 and CMake 3.22.1.

```bash
export ANDROID_HOME=/absolute/path/to/android-sdk
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
scripts/build-mobile-tests.sh android
```

Artifacts go into ignored `.local/mobile-release`. The APK uses Expo's generated test signing configuration. For EAS-hosted builds, authenticate a user-owned Expo account and link the project, then run `npx eas-cli@latest build --platform android --profile preview` from `frontend`. The existing `preview` iOS profile is intended for separately configured device signing. No EAS account/project ID has been invented or provisioned.

Verify downloads with the release's `SHA256SUMS.txt` (`shasum -a 256 -c SHA256SUMS.txt` from the download directory).

## Verified for this test release

Android app1.1.0/versionCode2 was built with Gradle assembleRelease (617 tasks) on1November2026. APK v2 signature verification,16KB ZIP alignment and non-debuggable checks passed. Live API address and ARM64/x86_64 native libraries are embedded. Installed successfully over the previous test APK with matching test signature and cold-launched on Android16/API36 ARM64 emulator; app stayed alive with no AndroidRuntime/ReactNativeJS error during startup. This is an installation/launch smoke test, not full native chat/CAPTCHA/theme journeys or a physical-device test. User-visible emulator was kept closed; the test ran in the background after compilation to avoid resource contention. Web/Android/iOS exports, lint and types passed; iOS signing remains deferred.

New features: open signup with mobile required, CAPTCHA on signup/login, explicit phase2 verification disclosure, accepted-connection chat, reactive reporting suspension, operator photo removal, WebP uploads and Light/Dark/System themes. Older1.0.0 APK cannot complete CAPTCHA authentication and should be upgraded. Existing production accounts/passwords remain unchanged; complete missing legacy mobile in Account.

APK SHA-256: `efccdd844f0c83658157e5e71ad792575eff0830c97f115e09f49221b4f4cde3` (53,654,002bytes). The release includes SHA256SUMS.txt. Application source corresponds to the feature commit d0adaab941e6 (subsequent image-source f8817983e778 only adds build-context exclusions); final release documentation may be newer. See current release/verification report for actual deployed source and restrictions.
