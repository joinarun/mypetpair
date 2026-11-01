#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.local/mobile-release"
export EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL:-https://mypetpair-248924650823.us-central1.run.app}"
mkdir -p "$OUT"
cd "$ROOT/frontend"
case "${1:-}" in
  android)
    : "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK directory}"
    npx expo prebuild --platform android --no-install
    cd android
    ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64 --max-workers=4
    cp app/build/outputs/apk/release/app-release.apk "$OUT/MyPetPair-1.0.0-android-test.apk"
    (cd "$OUT" && shasum -a 256 MyPetPair-1.0.0-android-test.apk > SHA256SUMS.txt)
    ;;
  *) echo 'Usage: scripts/build-mobile-tests.sh android' >&2; exit 2 ;;
esac
echo "Test artifact saved in $OUT"
