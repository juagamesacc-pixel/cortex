#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")/client"

echo "=== Starting Cortex React Development Server ==="
cd "$CLIENT_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing client dependencies with pnpm..."
  pnpm install
fi

pnpm run dev
