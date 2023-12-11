#!/bin/bash
# ─── BrightChain Email Gateway Test Script ───────────────────────────────────
# This script helps test the email gateway in the devcontainer.
#
# Usage:
#   ./test-email.sh send [recipient]    - Send a test email
#   ./test-email.sh watch               - Watch for incoming mail
#   ./test-email.sh list                - List received mail
#   ./test-email.sh read <filename>     - Read a specific email
#   ./test-email.sh status              - Check Postfix status
#   ./test-email.sh logs                - Show Postfix logs

MAIL_DROP_DIR="/var/spool/brightchain/incoming"
CATCHALL_DIR="/var/spool/brightchain/catchall"

case "$1" in
  send)
    RECIPIENT="${2:-alice@brightchain.local}"
    SUBJECT="Test Email $(date +%Y%m%d-%H%M%S)"
    BODY="This is a test email sent at $(date).\n\nFrom: BrightChain Email Gateway Test"
    
    echo "Sending test email to: $RECIPIENT"
    echo -e "$BODY" | sendmail -f "test@localhost" "$RECIPIENT" <<EOF
From: Test Sender <test@localhost>
To: $RECIPIENT
Subject: $SUBJECT
Date: $(date -R)
Content-Type: text/plain; charset=utf-8

$BODY
EOF
    
    if [ $? -eq 0 ]; then
      echo "✓ Email queued for delivery"
      echo ""
      echo "Check for delivery:"
      echo "  ls -la $MAIL_DROP_DIR/new/"
    else
      echo "✗ Failed to send email"
      exit 1
    fi
    ;;
    
  watch)
    echo "Watching for new mail in $MAIL_DROP_DIR/new/"
    echo "Press Ctrl+C to stop"
    echo ""
    watch -n1 "ls -la $MAIL_DROP_DIR/new/ 2>/dev/null || echo 'No mail yet'"
    ;;
    
  list)
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  INBOUND MAIL ($MAIL_DROP_DIR/new/)"
    echo "═══════════════════════════════════════════════════════════════════════════"
    ls -la "$MAIL_DROP_DIR/new/" 2>/dev/null || echo "  (empty)"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  CATCHALL MAIL ($CATCHALL_DIR/new/)"
    echo "═══════════════════════════════════════════════════════════════════════════"
    ls -la "$CATCHALL_DIR/new/" 2>/dev/null || echo "  (empty)"
    ;;
    
  read)
    if [ -z "$2" ]; then
      echo "Usage: $0 read <filename>"
      echo ""
      echo "Available files in $MAIL_DROP_DIR/new/:"
      ls "$MAIL_DROP_DIR/new/" 2>/dev/null || echo "  (none)"
      exit 1
    fi
    
    FILE="$MAIL_DROP_DIR/new/$2"
    if [ ! -f "$FILE" ]; then
      FILE="$CATCHALL_DIR/new/$2"
    fi
    
    if [ -f "$FILE" ]; then
      echo "═══════════════════════════════════════════════════════════════════════════"
      echo "  $FILE"
      echo "═══════════════════════════════════════════════════════════════════════════"
      cat "$FILE"
    else
      echo "File not found: $2"
      exit 1
    fi
    ;;
    
  status)
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  POSTFIX STATUS"
    echo "═══════════════════════════════════════════════════════════════════════════"
    postfix status 2>&1 || true
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  MAIL QUEUE"
    echo "═══════════════════════════════════════════════════════════════════════════"
    mailq 2>&1 || echo "  (empty or unavailable)"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  LISTENING PORTS"
    echo "═══════════════════════════════════════════════════════════════════════════"
    ss -tlnp | grep -E ':(25|587|2526)\s' || echo "  (none found)"
    ;;
    
  logs)
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "  POSTFIX LOGS (last 50 lines)"
    echo "═══════════════════════════════════════════════════════════════════════════"
    tail -50 /var/log/mail.log 2>/dev/null || journalctl -u postfix -n 50 2>/dev/null || echo "  (logs not available)"
    ;;
    
  *)
    echo "BrightChain Email Gateway Test Script"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  send [recipient]  - Send a test email (default: alice@brightchain.local)"
    echo "  watch             - Watch for incoming mail"
    echo "  list              - List received mail"
    echo "  read <filename>   - Read a specific email"
    echo "  status            - Check Postfix status"
    echo "  logs              - Show Postfix logs"
    echo ""
    echo "Examples:"
    echo "  $0 send"
    echo "  $0 send bob@brightchain.local"
    echo "  $0 list"
    echo "  $0 read 1234567890.hostname.12345.abc123"
    ;;
esac
