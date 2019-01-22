#!/usr/bin/env sh
set -euo pipefail

url="${EXPORTER_REDIS_URL:-redis://localhost:6379/0}"
prefix="${EXPORTER_PREFIX:-bull}"
metric_prefix="${EXPORTER_STAT_PREFIX:-bull_queue_}"
queues="${EXPORTER_QUEUES:-}"

# shellcheck disable=2086
exec node dist/src/index.js --url "$url" --prefix "$prefix" --metric-prefix "$metric_prefix" $queues
