#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="server.log"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] prod_forever.sh starting" >> "$LOG_FILE"

while true; do
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting yarn serve:api:prod" >> "$LOG_FILE"
  yarn serve:api:prod >> "$LOG_FILE" 2>&1 || true
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Process exited (code $?), restarting in 2 seconds..." >> "$LOG_FILE"
  sleep 2
done
