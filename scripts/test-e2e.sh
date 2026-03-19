#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker/docker-compose.test.yml"

echo "=== Starting Misskey test server ==="
docker compose -f "$COMPOSE_FILE" up -d

echo "=== Waiting for Misskey to be ready ==="
for i in $(seq 1 60); do
  if curl -sf http://localhost:3333/api/meta > /dev/null 2>&1; then
    echo "Misskey is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Timeout: Misskey did not start in time."
    docker compose -f "$COMPOSE_FILE" logs misskey
    docker compose -f "$COMPOSE_FILE" down -v
    exit 1
  fi
  sleep 2
done

echo "=== Seeding test data ==="
npx tsx docker/setup/seed.ts

echo "=== Running E2E tests ==="
npx vitest run --config vitest.e2e.config.ts
TEST_EXIT=$?

echo "=== Tearing down ==="
docker compose -f "$COMPOSE_FILE" down -v

exit $TEST_EXIT
