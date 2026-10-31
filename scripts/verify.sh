#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd backend && mvn -s maven-settings.xml -B verify)
(cd frontend && npm ci && npm run lint && npm run typecheck && npm run export:all)
python3 scripts/check-secrets.py
