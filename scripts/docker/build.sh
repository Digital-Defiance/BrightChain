#!/usr/bin/env bash
# Build the BrightChain production Docker image.
#
# Usage:
#   export FONTAWESOME_NPM_AUTH_TOKEN=...
#   ./scripts/docker/build.sh [tag]
#   ./scripts/docker/build.sh 0.33.0
#   TAG=0.33.0-dev ./scripts/docker/build.sh
#   ./scripts/docker/build.sh --dev
#   NO_CACHE=1 ./scripts/docker/build.sh
#   TAG_LATEST=1 ./scripts/docker/build.sh 0.33.0
#
# Environment:
#   DOCKER_IMAGE              default: digitaldefiance/brightchain
#   FONTAWESOME_NPM_AUTH_TOKEN  required
#   TAG                       image tag (default: package.json version)
#   TAG_LATEST                also tag :latest when set to 1
#   NO_CACHE                  pass --no-cache to docker build when set to 1
#   DOCKERFILE                default: Dockerfile (use Dockerfile.dev with --dev)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

USE_DEV=0
TAG_ARG=""
NO_CACHE_FLAG=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      USE_DEV=1
      shift
      ;;
    --no-cache)
      NO_CACHE_FLAG=(--no-cache)
      shift
      ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "${TAG_ARG}" ]]; then
        TAG_ARG="$1"
        shift
      else
        echo "ERROR: unexpected argument: $1" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ "${USE_DEV}" -eq 1 ]]; then
  DOCKERFILE="Dockerfile.dev"
fi

if [[ "${NO_CACHE:-}" == "1" ]]; then
  NO_CACHE_FLAG=(--no-cache)
fi

TAG="$(resolve_tag "${TAG_ARG}")"
require_fontawesome_token

IMAGE_REF="${DOCKER_IMAGE}:${TAG}"
BUILD_ARGS=()
while IFS= read -r arg; do
  BUILD_ARGS+=("${arg}")
done < <(docker_build_args)

echo "Building ${IMAGE_REF} from ${DOCKERFILE}..."

if [[ ${#NO_CACHE_FLAG[@]} -gt 0 ]]; then
  docker build \
    "${BUILD_ARGS[@]}" \
    "${NO_CACHE_FLAG[@]}" \
    --tag "${IMAGE_REF}" \
    "${REPO_ROOT}"
else
  docker build \
    "${BUILD_ARGS[@]}" \
    --tag "${IMAGE_REF}" \
    "${REPO_ROOT}"
fi

if [[ "${TAG_LATEST:-}" == "1" ]]; then
  docker tag "${IMAGE_REF}" "${DOCKER_IMAGE}:latest"
  echo "Also tagged ${DOCKER_IMAGE}:latest"
fi

echo "Built ${IMAGE_REF}"
