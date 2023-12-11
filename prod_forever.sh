#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/server.log"
PID_FILE="$SCRIPT_DIR/prod_forever.pid"
CHILD_PID_FILE="$SCRIPT_DIR/prod_forever.child.pid"

# Self-daemonize: if stdout is a terminal, re-launch in the background and exit
if [ -t 1 ]; then
  # Refuse to start if a previous instance is still running
  if [ -f "$PID_FILE" ]; then
    existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${existing_pid:-}" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "prod_forever.sh already running (PID $existing_pid). Use term_prod_forever.sh to stop it."
      exit 1
    fi
    rm -f "$PID_FILE"
  fi

  "$0" "$@" >> "$LOG_FILE" 2>&1 &
  bg_pid=$!
  disown
  echo "$bg_pid" > "$PID_FILE"
  echo "Started in background (PID $bg_pid), logging to $LOG_FILE"
  echo "PID file: $PID_FILE"
  exit 0
fi

# Background body: record our own PID and clean up on exit
echo "$$" > "$PID_FILE"

cleanup() {
  if [ -f "$CHILD_PID_FILE" ]; then
    child_pid="$(cat "$CHILD_PID_FILE" 2>/dev/null || true)"
    if [ -n "${child_pid:-}" ] && kill -0 "$child_pid" 2>/dev/null; then
      # Try to terminate the child's whole process group first, then fall back
      # to killing the child plus any descendants.
      kill -TERM "-$child_pid" 2>/dev/null || true
      kill -TERM "$child_pid" 2>/dev/null || true
      # Best-effort: kill descendants (yarn -> node) on systems without setsid
      if command -v pkill >/dev/null 2>&1; then
        pkill -TERM -P "$child_pid" 2>/dev/null || true
      fi
    fi
    rm -f "$CHILD_PID_FILE"
  fi
  rm -f "$PID_FILE"
  exit 0
}
trap cleanup TERM INT HUP

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] prod_forever.sh starting (PID $$)"

# Prefer setsid so the child gets its own process group; fall back if absent.
if command -v setsid >/dev/null 2>&1; then
  RUN_PREFIX=(setsid)
else
  RUN_PREFIX=()
fi

while true; do
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting yarn serve:api:prod"
  set +e
  "${RUN_PREFIX[@]}" yarn serve:api:prod &
  child_pid=$!
  echo "$child_pid" > "$CHILD_PID_FILE"
  wait "$child_pid"
  set -e
  rm -f "$CHILD_PID_FILE"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Process exited, restarting in 2 seconds..."
  sleep 2
done
