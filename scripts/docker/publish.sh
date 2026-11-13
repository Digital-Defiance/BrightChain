#!/usr/bin/env bash
# Build and push the BrightChain Docker image to Docker Hub.
#
# Usage:
#   docker login
#   export FONTAWESOME_NPM_AUTH_TOKEN=...
#   ./scripts/docker/publish.sh [tag]
#   ./scripts/docker/publish.sh 0.33.0
#   PUBLISH_LATEST=0 ./scripts/docker/publish.sh 0.33.0
#   MULTIARCH=1 ./scripts/docker/publish.sh 0.33.0
#
# Environment:
#   DOCKER_IMAGE                default: digitaldefiance/brightchain
#   FONTAWESOME_NPM_AUTH_TOKEN    required
#   TAG                         image tag (default: package.json version)
#   PUBLISH_LATEST              also push :latest (default: 1)
#   MULTIARCH                   build/push linux/amd64,linux/arm64 (default: 0)
#   BUILDX_BUILDER              buildx builder name (default: brightchain-builder)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TAG_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "${TAG_ARG}" ]]; then
        TAG_ARG="$1"
      else
        echo "ERROR: unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

TAG="$(resolve_tag "${TAG_ARG}")"
require_fontawesome_token

IMAGE_REF="${DOCKER_IMAGE}:${TAG}"
PUBLISH_LATEST="${PUBLISH_LATEST:-1}"
MULTIARCH="${MULTIARCH:-0}"

if [[ "${MULTIARCH}" == "1" ]]; then
  BUILDER="${BUILDX_BUILDER:-brightchain-builder}"
  if ! docker buildx inspect "${BUILDER}" >/dev/null 2>&1; then
    docker buildx create --name "${BUILDER}" --use
  else
    docker buildx use "${BUILDER}"
  fi

  TAGS=(--tag "${IMAGE_REF}")
  if [[ "${PUBLISH_LATEST}" == "1" ]]; then
    TAGS+=(--tag "${DOCKER_IMAGE}:latest")
  fi

  BUILD_ARGS=()
  while IFS= read -r arg; do
    BUILD_ARGS+=("${arg}")
  done < <(docker_build_args)

  echo "Building and pushing multi-arch ${IMAGE_REF}..."

  docker buildx build \
    "${BUILD_ARGS[@]}" \
    --platform linux/amd64,linux/arm64 \
    "${TAGS[@]}" \
    --push \
    "${REPO_ROOT}"
else
  TAG_LATEST=0
  if [[ "${PUBLISH_LATEST}" == "1" ]]; then
    TAG_LATEST=1
  fi

  TAG_LATEST="${TAG_LATEST}" "${SCRIPT_DIR}/build.sh" "${TAG}"

  echo "Pushing ${IMAGE_REF}..."
  docker push "${IMAGE_REF}"

  if [[ "${PUBLISH_LATEST}" == "1" ]]; then
    echo "Pushing ${DOCKER_IMAGE}:latest..."
    docker push "${DOCKER_IMAGE}:latest"
  fi
fi

echo "Published ${IMAGE_REF}"
if [[ "${PUBLISH_LATEST}" == "1" ]]; then
  echo "Published ${DOCKER_IMAGE}:latest"
fi
