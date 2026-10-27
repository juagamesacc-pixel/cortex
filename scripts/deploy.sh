#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== Deploying Cortex Android APK ==="
bash "$SCRIPT_DIR/build-android.sh"

cd "$PROJECT_ROOT/android"
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew
  ./gradlew assembleDebug
  echo "✓ Debug APK generated in: $PROJECT_ROOT/android/app/build/outputs/apk/debug/"
else
  echo "Gradle wrapper not present. You can build in Android Studio or run gradle assembleDebug."
fi
