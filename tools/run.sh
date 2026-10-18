#!/usr/bin/env bash
# Lance le jeu en local : http://localhost:3000 (ajouter ?low=1 pour le mode performance).
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -d node_modules ]] || npm ci
exec npx next dev "$@"
