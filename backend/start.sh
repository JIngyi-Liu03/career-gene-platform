#!/bin/sh
set -e

echo "[start] generating prisma client..."
npx prisma generate

echo "[start] applying database schema (waiting for db)..."
for i in $(seq 1 30); do
  if npx prisma db push --skip-generate --accept-data-loss; then
    echo "[start] database schema ready"
    break
  fi
  echo "[start] database not ready, retrying ($i/30)..."
  sleep 2
done

echo "[start] launching NestJS server..."
exec node dist/main.js
