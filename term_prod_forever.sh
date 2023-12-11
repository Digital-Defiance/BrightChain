#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/prod_forever.pid"
CHILD_PID_FILE="$SCRIPT_DIR/prod_forever.child.pid"

WAIT_SECS="${WAIT_SECS:-15}"

if [ ! -f "$PID_FILE" ]; then
  echo "No PID file at $PID_FILE; prod_forever.sh does not appear to be running."
  # Best-effort cleanup of any orphaned child PID file
  rm -f "$CHILD_PID_FILE"
  exit 0
fi

supervisor_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -z "${supervisor_pid:-}" ]; then
  echo "PID file is empty; removing it."
  rm -f "$PID_FILE" "$CHILD_PID_FILE"
  exit 0
fi

if ! kill -0 "$supervisor_pid" 2>/dev/null; then
  echo "Supervisor PID $supervisor_pid is not running; cleaning up stale PID files."
  rm -f "$PID_FILE" "$CHILD_PID_FILE"
  exit 0
fi

echo "Sending SIGTERM to prod_forever.sh supervisor (PID $supervisor_pid)..."
kill -TERM "$supervisor_pid" 2>/dev/null || true

# Wait for the supervisor to exit (it traps TERM and stops its child)
for _ in $(seq 1 "$WAIT_SECS"); do
  if ! kill -0 "$supervisor_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done

if kill -0 "$supervisor_pid" 2>/dev/null; then
  echo "Supervisor still alive after ${WAIT_SECS}s; sending SIGKILL."
  kill -KILL "$supervisor_pid" 2>/dev/null || true
fi

# Best-effort: ensure the yarn/node child tree is gone
if [ -f "$CHILD_PID_FILE" ]; then
  child_pid="$(cat "$CHILD_PID_FILE" 2>/dev/null || true)"
  if [ -n "${child_pid:-}" ] && kill -0 "$child_pid" 2>/dev/null; then
    echo "Force-killing child process group (PID $child_pid)..."
    kill -KILL "-$child_pid" 2>/dev/null || true
    kill -KILL "$child_pid" 2>/dev/null || true
    if command -v pkill >/dev/null 2>&1; then
      pkill -KILL -P "$child_pid" 2>/dev/null || true
    fi
  fi
fi

rm -f "$PID_FILE" "$CHILD_PID_FILE"
echo "prod_forever.sh terminated."
