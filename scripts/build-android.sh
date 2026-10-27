#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLIENT_DIR="$PROJECT_ROOT/client"
ASSETS_DIR="$PROJECT_ROOT/android/app/src/main/assets/cortex"

echo "=== Building Cortex React Client for Android ==="
cd "$CLIENT_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies with pnpm..."
  pnpm install
fi

echo "Running build..."
pnpm run build

echo "Syncing build output to Android assets..."
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"
cp -r "$CLIENT_DIR/dist/"* "$ASSETS_DIR/"

echo "✓ Build complete. React assets ready in: $ASSETS_DIR"
