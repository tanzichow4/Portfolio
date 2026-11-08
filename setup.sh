#!/usr/bin/env bash
# Usage: ./setup.sh [--fresh-git]
set -e
cd "$(dirname "$0")"
PY=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c "import sys" >/dev/null 2>&1; then PY="$c"; break; fi
done
[ -n "$PY" ] || { echo "Python 3.10+ not found"; exit 1; }
"$PY" scripts/setup.py "$@"
