#!/bin/bash
set -e

# Print debug info
echo "Container started. PID: $$"
echo "Arguments: $@"
echo "Environment:"
env | grep -E "(VSCODE|REMOTE)" || true

# ─── Start Email Gateway services ───────────────────────────────────────────
# Ensure mail drop directories exist with correct ownership
mkdir -p /var/spool/brightchain/incoming/new \
         /var/spool/brightchain/incoming/cur \
         /var/spool/brightchain/incoming/tmp \
         /var/spool/brightchain/errors
chown -R brightchain:brightchain /var/spool/brightchain 2>/dev/null || true
# Allow the node user (remoteUser) to read/write the mail drop for InboundProcessor
chmod -R g+rwx /var/spool/brightchain 2>/dev/null || true
usermod -aG brightchain node 2>/dev/null || true

# Ensure OpenDKIM run directory exists
mkdir -p /run/opendkim
chown opendkim:opendkim /run/opendkim

# Start OpenDKIM (DKIM signing milter)
if command -v opendkim &> /dev/null; then
  echo "Starting OpenDKIM..."
  opendkim -x /etc/opendkim.conf || echo "OpenDKIM failed to start (non-fatal in dev)"
fi

# Start Postfix
if command -v postfix &> /dev/null; then
  echo "Starting Postfix..."
  # Fix Postfix directory permissions
  postfix set-permissions 2>/dev/null || true
  postfix start || echo "Postfix failed to start (non-fatal in dev)"
fi

echo "Email Gateway services initialized."
# ─────────────────────────────────────────────────────────────────────────────

# Set up signal handlers for graceful shutdown
cleanup() {
  echo "Shutting down gracefully..."
  postfix stop 2>/dev/null || true
  kill "$(cat /run/opendkim/opendkim.pid 2>/dev/null)" 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT

# Start the original command in background
if [ $# -gt 0 ]; then
    echo "Executing: $@"
    "$@" &
    CHILD_PID=$!
    echo "Child process started with PID: $CHILD_PID"

    # Wait for child process and handle signals
    wait $CHILD_PID
    EXIT_CODE=$?
    echo "Child process exited with code: $EXIT_CODE"
    exit $EXIT_CODE
else
    echo "No command provided, running sleep infinity"
    exec sleep infinity
fi
