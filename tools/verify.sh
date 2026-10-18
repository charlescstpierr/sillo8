#!/usr/bin/env bash
# Vérification complète : types, tests unitaires, build de production, tests navigateur + captures.
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsc --noEmit
npx vitest run
npx next build
npx playwright test
python3 tools/compose_poses.py
git diff --check
