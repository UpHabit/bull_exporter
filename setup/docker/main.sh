#!/usr/bin/env bash
set -euo pipefail

url="${EXPORTER_REDIS_URL:-redis://localhost:6379/0}"
tls="${EXPORTER_REDIS_TLS:-}"
prefix="${EXPORTER_PREFIX:-bull}"
metric_prefix="${EXPORTER_STAT_PREFIX:-bull_queue_}"
queues="${EXPORTER_QUEUES:-}"
EXPORTER_AUTODISCOVER="${EXPORTER_AUTODISCOVER:-}"

flags=(
  --url "$url"
  --tls "$tls"
  --prefix "$prefix"
  --metric-prefix "$metric_prefix"
)

if [[ "$EXPORTER_AUTODISCOVER" != 0 && "$EXPORTER_AUTODISCOVER" != 'false' ]] ; then
  flags+=(-a)
fi

# shellcheck disable=2206
flags+=($queues)

exec node dist/src/index.js "${flags[@]}"
