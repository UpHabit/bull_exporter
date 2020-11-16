#!/usr/bin/env bash
set -euo pipefail

url="${EXPORTER_REDIS_URL:-redis://localhost:6379/0}"
prefix="${EXPORTER_PREFIX:-bull}"
metric_prefix="${EXPORTER_STAT_PREFIX:-bull_queue_}"
queues="${EXPORTER_QUEUES:-}"
sentinel_extra_endpoints="${EXPORTER_SENTINEL_EXTRA_ENDPOINTS:-}"
sentinel_master_name="${EXPORTER_SENTINEL_MASTER_NAME:-}"
EXPORTER_AUTODISCOVER="${EXPORTER_AUTODISCOVER:-}"

flags=(
  --url "$url"
  --prefix "$prefix"
  --metric-prefix "$metric_prefix"
  --sentinel-extra-endpoints EXPORTER_SENTINEL_EXTRA_ENDPOINTS --
  --sentinel-master-name "$sentinel_master_name"
)

if [[ "$EXPORTER_AUTODISCOVER" != 0 && "$EXPORTER_AUTODISCOVER" != 'false' ]] ; then
  flags+=(-a)
fi

# shellcheck disable=2206
flags+=($queues)

exec node dist/src/index.js "${flags[@]}"
