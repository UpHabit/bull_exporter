#!/usr/bin/env bash
set -euo pipefail

url="${EXPORTER_REDIS_URL:-redis://localhost:6379/0}"
prefix="${EXPORTER_PREFIX:-bull}"
metric_prefix="${EXPORTER_STAT_PREFIX:-bull_queue_}"
queues="${EXPORTER_QUEUES:-}"
EXPORTER_AUTODISCOVER="${EXPORTER_AUTODISCOVER:-}"
queues_to_follow="${QUEUES_TO_FOLLOW:-}"

flags=(
  --url "$url"
  --prefix "$prefix"
  --metric-prefix "$metric_prefix"
  --queues-to-follow "$queues_to_follow"
)

if [[ "$EXPORTER_AUTODISCOVER" != 0 && "$EXPORTER_AUTODISCOVER" != 'false' ]] ; then
  flags+=(-a)
fi

# shellcheck disable=2206
flags+=($queues)

exec node dist/src/index.js "${flags[@]}"
