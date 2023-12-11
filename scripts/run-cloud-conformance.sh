#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Cloud Store Conformance Tests
#
# Starts LocalStack (S3) and Azurite (Azure Blob) in Docker, runs the
# conformance test suites against them, then cleans up the containers.
#
# Usage:
#   ./scripts/run-cloud-conformance.sh          # run both
#   ./scripts/run-cloud-conformance.sh azure     # azure only
#   ./scripts/run-cloud-conformance.sh s3        # s3 only
#   ./scripts/run-cloud-conformance.sh --keep    # don't stop containers after
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

KEEP_CONTAINERS=false
RUN_AZURE=true
RUN_S3=true
EXIT_CODE=0

for arg in "$@"; do
  case "$arg" in
    azure) RUN_S3=false ;;
    s3)    RUN_AZURE=false ;;
    --keep) KEEP_CONTAINERS=true ;;
    *)     echo "Unknown arg: $arg"; echo "Usage: $0 [azure|s3] [--keep]"; exit 1 ;;
  esac
done

# ─── Colors ──────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[fail]${NC}  $*"; }

# ─── Check Docker ────────────────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
  fail "Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info &>/dev/null; then
  fail "Docker daemon is not running."
  exit 1
fi

# ─── Container management ───────────────────────────────────────────────────

start_container() {
  local name="$1" image="$2" port="$3"
  shift 3
  # remaining args are extra docker run flags

  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    info "${name} is already running."
    return 0
  fi

  # Remove stopped container with same name if it exists
  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "$name" &>/dev/null
  fi

  info "Starting ${name} (${image}) on port ${port}..."
  docker run -d --name "$name" -p "${port}:${port}" "$@" "$image" >/dev/null
  ok "${name} started."
}

start_azurite() {
  local name="bc-azurite"
  local image="mcr.microsoft.com/azure-storage/azurite"
  local port=10000

  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    info "${name} is already running."
    return 0
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "$name" &>/dev/null
  fi

  info "Starting ${name} (${image}) on port ${port} with --skipApiVersionCheck..."
  docker run -d --name "$name" \
    -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    "$image" \
    azurite --skipApiVersionCheck --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0 >/dev/null
  ok "${name} started."
}

start_minio() {
  local name="bc-minio"
  local image="minio/minio"

  if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
    info "${name} is already running."
    return 0
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
    docker rm -f "$name" &>/dev/null
  fi

  info "Starting ${name} (${image}) on port 9000..."
  docker run -d --name "$name" \
    -p 9000:9000 -p 9001:9001 \
    -e "MINIO_ROOT_USER=minioadmin" \
    -e "MINIO_ROOT_PASSWORD=minioadmin" \
    "$image" server /data --console-address ":9001" >/dev/null
  ok "${name} started."
}

wait_for_port() {
  local port="$1" name="$2" max_wait=30 elapsed=0

  info "Waiting for ${name} on port ${port}..."
  while ! nc -z localhost "$port" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [ "$elapsed" -ge "$max_wait" ]; then
      fail "${name} did not become ready within ${max_wait}s."
      return 1
    fi
  done
  ok "${name} is ready."
}

cleanup() {
  if [ "$KEEP_CONTAINERS" = true ]; then
    warn "Leaving containers running (--keep)."
    return
  fi

  echo ""
  info "Cleaning up containers..."

  if [ "$RUN_S3" = true ] && docker ps -a --format '{{.Names}}' | grep -q '^bc-minio$'; then
    docker rm -f bc-minio >/dev/null 2>&1
    ok "bc-minio removed."
  fi

  if [ "$RUN_AZURE" = true ] && docker ps -a --format '{{.Names}}' | grep -q '^bc-azurite$'; then
    docker rm -f bc-azurite >/dev/null 2>&1
    ok "bc-azurite removed."
  fi
}

trap cleanup EXIT

# ─── Start emulators ────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  BrightChain Cloud Store Conformance Tests"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$RUN_S3" = true ]; then
  start_minio
  wait_for_port 9000 "MinIO"
fi

if [ "$RUN_AZURE" = true ]; then
  start_azurite
  wait_for_port 10000 "Azurite"
fi

# ─── Export env vars ─────────────────────────────────────────────────────────

if [ "$RUN_S3" = true ]; then
  export S3_CONFORMANCE_TEST=1
  export AWS_S3_ENDPOINT=http://localhost:9000
  export AWS_ACCESS_KEY_ID=minioadmin
  export AWS_SECRET_ACCESS_KEY=minioadmin
  export AWS_REGION=us-east-1
fi

if [ "$RUN_AZURE" = true ]; then
  export AZURE_CONFORMANCE_TEST=1
  export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
fi

# ─── Run tests ───────────────────────────────────────────────────────────────

echo ""

if [ "$RUN_S3" = true ]; then
  info "Running S3 conformance tests..."
  echo ""
  if NODE_OPTIONS="--experimental-vm-modules" yarn nx test brightchain-s3-store --jestConfig=brightchain-s3-store/jest.conformance.config.ts; then
    ok "S3 conformance: PASSED"
  else
    fail "S3 conformance: FAILED"
    EXIT_CODE=1
  fi
  echo ""
fi

if [ "$RUN_AZURE" = true ]; then
  info "Running Azure conformance tests..."
  echo ""
  if yarn nx test brightchain-azure-store --testPathPatterns=conformance; then
    ok "Azure conformance: PASSED"
  else
    fail "Azure conformance: FAILED"
    EXIT_CODE=1
  fi
  echo ""
fi

# ─── Summary ─────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════"
if [ "$EXIT_CODE" -eq 0 ]; then
  ok "All conformance tests passed."
else
  fail "Some conformance tests failed."
fi
echo "═══════════════════════════════════════════════════════════════"

exit $EXIT_CODE
