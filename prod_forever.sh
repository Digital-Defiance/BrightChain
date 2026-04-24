#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/server.log"

# Self-daemonize: if stdout is a terminal, re-launch in the background and exit
if [ -t 1 ]; then
  "$0" "$@" >> "$LOG_FILE" 2>&1 &
  disown
  echo "Started in background (PID $!), logging to $LOG_FILE"
  exit 0
fi

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] prod_forever.sh starting"

while true; do
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting yarn serve:api:prod"
  yarn serve:api:prod || true
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Process exited, restarting in 2 seconds..."
  sleep 2
done
