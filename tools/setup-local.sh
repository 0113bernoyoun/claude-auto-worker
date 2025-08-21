#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==> 🛠️  Local setup starting..."

have() { command -v "$1" >/dev/null 2>&1; }

NODE_REQUIRED_MAJOR=20

if ! have node; then
  echo "❌ Node.js not found. Please install Node.js ${NODE_REQUIRED_MAJOR}.x LTS"
  exit 1
fi

NODE_VERSION_RAW="$(node -v 2>/dev/null || echo "v0.0.0")"
NODE_MAJOR="${NODE_VERSION_RAW#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"

echo "➡️  Detected Node.js: ${NODE_VERSION_RAW}"
if [ "$NODE_MAJOR" -lt "$NODE_REQUIRED_MAJOR" ]; then
  echo "⚠️  Recommended Node.js ${NODE_REQUIRED_MAJOR}.x LTS for local path. Current: ${NODE_VERSION_RAW}"
  echo "   Proceeding anyway, but some features may be limited."
fi

if ! have npm; then
  echo "❌ npm not found. Please install Node.js which bundles npm."
  exit 1
fi

if ! have git; then
  echo "❌ git not found. Please install Git (2.x or later)."
  exit 1
fi

echo "==> 📦 Installing dependencies (npm ci || npm install)"
if ! npm ci; then
  npm install
fi

echo "==> 🧱 Building app (nest build)"
npm run build

echo "==> 🧱 Building CLI (tsc -p tsconfig.cli.json)"
npm run cli:build

echo "==> ✅ Setup complete. Helpful next commands:"
echo "   - npm run start:dev       # Start API server at :5849"
echo "   - node bin/claude-auto-worker --help"
echo "   - npm run verify:local    # Build→Test→Smoke"
echo "   - npm run env:example     # Generate .env.example"


