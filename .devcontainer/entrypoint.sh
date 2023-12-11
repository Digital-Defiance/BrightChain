#!/bin/bash
set -e

# Print debug info
echo "Container started. PID: $"
echo "Arguments: $@"
echo "Environment:"
env | grep -E "(VSCODE|REMOTE)" || true

# ─── Start Email Gateway services ───────────────────────────────────────────
# Ensure mail drop directories exist with correct ownership
mkdir -p /var/spool/brightchain/incoming/new \
         /var/spool/brightchain/incoming/cur \
         /var/spool/brightchain/incoming/tmp \
         /var/spool/brightchain/errors \
         /var/spool/brightchain/catchall/new \
         /var/spool/brightchain/catchall/cur \
         /var/spool/brightchain/catchall/tmp
chown -R brightchain:brightchain /var/spool/brightchain 2>/dev/null || true
# Allow the node user (remoteUser) to read/write the mail drop for InboundProcessor
chmod -R g+rwx /var/spool/brightchain 2>/dev/null || true
usermod -aG brightchain node 2>/dev/null || true

# Check if we're in test mode
GATEWAY_TEST_MODE="${GATEWAY_TEST_MODE:-true}"
echo "Email Gateway Test Mode: $GATEWAY_TEST_MODE"

# Ensure OpenDKIM run directory exists
mkdir -p /run/opendkim
chown opendkim:opendkim /run/opendkim

# Start OpenDKIM (DKIM signing milter) — skip in test mode if DKIM is disabled
GATEWAY_TEST_SKIP_DKIM="${GATEWAY_TEST_SKIP_DKIM:-true}"
if [ "$GATEWAY_TEST_SKIP_DKIM" != "true" ]; then
  if command -v opendkim &> /dev/null; then
    echo "Starting OpenDKIM..."
    opendkim -x /etc/opendkim.conf || echo "OpenDKIM failed to start (non-fatal in dev)"
  fi
else
  echo "Skipping OpenDKIM (GATEWAY_TEST_SKIP_DKIM=true)"
fi

# Start Postfix
if command -v postfix &> /dev/null; then
  echo "Starting Postfix..."
  # Fix Postfix directory permissions
  postfix set-permissions 2>/dev/null || true
  postfix start || echo "Postfix failed to start (non-fatal in dev)"
fi

echo "Email Gateway services initialized."
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  EMAIL GATEWAY TEST MODE"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Postfix is running in localhost-only test mode."
echo "  Mail sent to any @brightchain.org, @brightchain.local, or @localhost"
echo "  address will be deposited in the Mail Drop Directory."
echo ""
echo "  To send a test email:"
echo "    echo 'Test body' | mail -s 'Test Subject' alice@brightchain.local"
echo ""
echo "  Or use swaks (if installed):"
echo "    swaks --to alice@brightchain.local --from test@localhost --server localhost"
echo ""
echo "  Inbound mail directory:  /var/spool/brightchain/incoming/new/"
echo "  Catchall directory:      /var/spool/brightchain/catchall/new/"
echo "  Error directory:         /var/spool/brightchain/errors/"
echo ""
echo "  To watch for new mail:"
echo "    watch -n1 'ls -la /var/spool/brightchain/incoming/new/'"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
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
