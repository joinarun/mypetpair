# Mobile testing builds

The Android APK is distributed as an asset on the private [GitHub mobile testing release](https://github.com/joinarun/mypetpair/releases/tag/v1.0.0-test.1). Sign in to GitHub with repository access to download it. It embeds the app's JavaScript bundle and uses the live pilot API at `https://mypetpair-248924650823.us-central1.run.app`. A Metro development server is not required. Registration still requires the pilot invitation; credentials and invitation codes are never bundled.

## Android

Download `MyPetPair-1.0.0-android-test.apk` (about 51 MiB) to an Android device and open it. It supports Android 7.0/API 24 and newer. Android may require permission for the browser/file manager to install this downloaded APK. This is an internal testing build, signed with the generated Android test key, not a Play Store release. It includes ARM64 and x86_64 native libraries. Do not use this signing key for a public release; a future production signing identity may require uninstalling this test app before installing that release.

With Android platform tools and USB debugging configured, install using:

```bash
adb install -r MyPetPair-1.0.0-android-test.apk
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

On 1 November 2026, Gradle `assembleRelease` completed successfully (575 tasks), frontend lint and TypeScript checks passed, APK Signature Scheme v2 verification passed, and `zipalign -c -P 16 4` passed. The packaged Hermes bundle contains the live API origin and no local API fallback. APK metadata confirms package `com.mypetpair.app`, version 1.0.0/code 1, minimum API 24 and target API 36. Application source in `frontend/src` is unchanged from commit `bffc9254a2e24a7ae44f466792c13cc9aada026b`; this release adds build tooling and instructions.

The exact release APK installed and cold-launched successfully on a fresh Android 16/API 36 ARM64 emulator, without Metro running. The app process remained alive and startup logs contained no MyPetPair AndroidRuntime or ReactNativeJS error. The first foreground emulator run showed a System UI ANR before MyPetPair was installed, during the resource-heavy native build. After the build finished, the emulator was restarted in the background with four cores/3 GiB and SwiftShader, and the installation/launch check passed. No full native UI journey, physical-device test, photo/location permission test or store submission is claimed. Gradle/dependency deprecation warnings remain; the checked-in Gradle 9.4.1 toolchain was used rather than upgrading to Gradle 10.

APK SHA-256: `2cec20a94ff726f0fa2b95621d37068456a3b8dca0d229893fd124f0e15b2e34`.
