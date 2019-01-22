#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [[ "$#" -gt 1 ]] || [[ "$#" -eq 1 && "${1:-}" != "--push" ]] ; then
    cat << USAGE
usage ${BASH_SOURCE[0]} [--push]

build and tag the docker image then optionally push it
USAGE
    exit 1
fi


# shellcheck disable=2001
BRANCH_NAME="$(echo "${TRAVIS_BRANCH:-}" | sed 's,/,_,g')"
hash="$(git log --pretty=format:'%h' -n 1)"
for tag in $(git tag -l --contains HEAD) ; do
    hash="${hash}-$tag"
done
if ! git diff --quiet ; then
    hash="$hash-dirty"
fi

docker build . -t bull_exporter:latest

printf '  \xF0\x9F\x90\xB3 \xF0\x9F\x94\xA8 Done building\n'
echo "        uphabit/bull_exporter:latest"
echo "        uphabit/bull_exporter:git-$hash"

docker tag bull_exporter:latest uphabit/bull_exporter:latest
docker tag bull_exporter:latest uphabit/bull_exporter:"git-$hash"
if [[ -n "${BRANCH_NAME:-}" ]] ; then
    docker tag bull_exporter:latest uphabit/bull_exporter:"branch-$BRANCH_NAME-latest"
    echo "        uphabit/bull_exporter:branch-$BRANCH_NAME-latest"
fi

if [[ "${1:-}" != "--push" ]]; then
    exit 0
fi

docker push  uphabit/bull_exporter:latest
docker push  uphabit/bull_exporter:"git-$hash"

if [[ -n "${BRANCH_NAME:-}" ]] ; then
    docker push uphabit/bull_exporter:"branch-$BRANCH_NAME-latest"
fi

printf '  \xF0\x9F\x90\xB3 \xE2\xAC\x86\xEF\xB8\x8F Upload Complete\n'
