#!/usr/bin/env bash
# Applies migrations (and optionally the seed) before handing over to the server.
set -euo pipefail

echo "[entrypoint] environnement=${ENVIRONMENT:-development}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] application des migrations Alembic…"
  alembic upgrade head
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] initialisation des données de référence…"
  python -m app.db.seed
fi

echo "[entrypoint] démarrage : $*"
exec "$@"
