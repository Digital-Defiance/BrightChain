#!/usr/bin/env bash
# Shared helpers for BrightChain Docker build/publish scripts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

DOCKER_IMAGE="${DOCKER_IMAGE:-digitaldefiance/brightchain}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

resolve_tag() {
  if [[ -n "${TAG:-}" ]]; then
    printf '%s' "${TAG}"
    return
  fi

  if [[ $# -gt 0 && -n "${1:-}" ]]; then
    printf '%s' "${1}"
    return
  fi

  node -p "require('${REPO_ROOT}/package.json').version"
}

require_fontawesome_token() {
  if [[ -z "${FONTAWESOME_NPM_AUTH_TOKEN:-}" ]]; then
    echo "ERROR: FONTAWESOME_NPM_AUTH_TOKEN is required to install @awesome.me packages during the image build." >&2
    echo "  export FONTAWESOME_NPM_AUTH_TOKEN=<your-fontawesome-npm-token>" >&2
    exit 1
  fi
}

docker_build_args() {
  printf '%s\n' \
    --file "${REPO_ROOT}/${DOCKERFILE}" \
    --build-arg "FONTAWESOME_NPM_AUTH_TOKEN=${FONTAWESOME_NPM_AUTH_TOKEN}"
}
