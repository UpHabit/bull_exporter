#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

BRANCH_NAME="$(echo "${TRAVIS_BRANCH:-}" | sed 's,/,_,g')"
hash="$(git log --pretty=format:'%h' -n 1)"
if ! git diff --quiet ; then
    hash="$hash-dirty"
fi

docker build . -t bull-prom-metrics:local-latest

docker tag bull-prom-metrics:local-latest bull-prom-metrics:latest
docker tag bull-prom-metrics:local-latest "bull-prom-metrics:git-$hash"
docker tag bull-prom-metrics:local-latest "274311808069.dkr.ecr.us-east-1.amazonaws.com/bull-prom-metrics:latest"
docker tag bull-prom-metrics:local-latest "274311808069.dkr.ecr.us-east-1.amazonaws.com/bull-prom-metrics:git-$hash"

eval "$(aws ecr get-login --no-include-email)"
docker push "274311808069.dkr.ecr.us-east-1.amazonaws.com/bull-prom-metrics:latest"
docker push "274311808069.dkr.ecr.us-east-1.amazonaws.com/bull-prom-metrics:git-$hash" &

if [[ -n "${BRANCH_NAME:-}" ]] ; then
    docker tag bull-prom-metrics:local-latest "274311808069.dkr.ecr.us-east-1.amazonaws.com/uphabit/bull-prom-metrics:branch-$BRANCH_NAME-latest"
    docker push "274311808069.dkr.ecr.us-east-1.amazonaws.com/uphabit/bull-prom-metrics:branch-$BRANCH_NAME-latest" &
fi

wait
