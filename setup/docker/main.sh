#!/usr/bin/env bash
set -euo pipefail

url="${EXPORTER_REDIS_URL:-redis://localhost:6379/0}"
prefix="${EXPORTER_PREFIX:-bull}"
metric_prefix="${EXPORTER_STAT_PREFIX:-bull_queue_}"
queues="${EXPORTER_QUEUES:-}"
EXPORTER_AUTODISCOVER="${EXPORTER_AUTODISCOVER:-}"
EXPORTER_REDIS_CLUSTER="${EXPORTER_REDIS_CLUSTER:-}"
EXPORTER_DISCOVER_QUEUES_KEY="${EXPORTER_DISCOVER_QUEUES_KEY:-}"

flags=(
  --url "$url"
  --prefix "$prefix"
  --metric-prefix "$metric_prefix"
  --discover-queues-key "${EXPORTER_DISCOVER_QUEUES_KEY}"
)

if [[ "$EXPORTER_AUTODISCOVER" != 0 && "$EXPORTER_AUTODISCOVER" != 'false' ]] ; then
  flags+=(-a)
fi

if [[ "$EXPORTER_REDIS_CLUSTER" != 0 && "$EXPORTER_REDIS_CLUSTER" != 'false' ]] ; then
  flags+=(-c)
fi

# shellcheck disable=2206
flags+=($queues)

exec node dist/src/index.js "${flags[@]}"
