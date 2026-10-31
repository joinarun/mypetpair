#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
(cd frontend && npm ci && npm run typecheck && npm run export:web)
mkdir -p backend/src/main/resources/static
cp -R frontend/dist/. backend/src/main/resources/static/
(cd backend && mvn -s maven-settings.xml -B verify)
printf '%s\n' 'Run: APP_SEED=true java -Djava.awt.headless=true -jar backend/target/mypetpair-api-1.0.0.jar'
