#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# BrightChain Node — Container Entrypoint
# ═══════════════════════════════════════════════════════════════════════════════
#
# 1. Substitutes %%DOMAIN%% and %%DKIM_SELECTOR%% in Postfix/OpenDKIM configs
# 2. Starts Postfix (inbound SMTP)
# 3. Starts OpenDKIM (DKIM signing milter)
# 4. Execs the main process (Node.js API server)
#
# ═══════════════════════════════════════════════════════════════════════════════

DOMAIN="${EMAIL_DOMAIN:?EMAIL_DOMAIN must be set}"
DKIM_SELECTOR="${GATEWAY_DKIM_SELECTOR:-default}"

echo "[entrypoint] BrightChain Node starting..."
echo "[entrypoint] Domain: ${DOMAIN}"
echo "[entrypoint] DKIM Selector: ${DKIM_SELECTOR}"

# ─── Template substitution ───────────────────────────────────────────────────
echo "[entrypoint] Applying config templates..."

sed -i "s/%%DOMAIN%%/${DOMAIN}/g" /etc/postfix/main.cf
sed -i "s/%%DOMAIN%%/${DOMAIN}/g" /etc/opendkim.conf
sed -i "s/%%DKIM_SELECTOR%%/${DKIM_SELECTOR}/g" /etc/opendkim.conf

# ─── Validate DKIM key ──────────────────────────────────────────────────────
if [ ! -f /etc/dkim/private.key ]; then
  echo "[entrypoint] WARNING: No DKIM private key at /etc/dkim/private.key"
  echo "[entrypoint]   Inbound DKIM verification will still work."
  echo "[entrypoint]   Outbound signing will be skipped (milter_default_action=accept)."
fi

# ─── Validate blockstore directory ──────────────────────────────────────────
BLOCKSTORE="${BRIGHTCHAIN_BLOCKSTORE_PATH:-/data/blockstore}"
if [ ! -d "${BLOCKSTORE}" ]; then
  echo "[entrypoint] Creating blockstore directory: ${BLOCKSTORE}"
  mkdir -p "${BLOCKSTORE}"
fi
chown -R node:node "${BLOCKSTORE}"

# ─── Start OpenDKIM ─────────────────────────────────────────────────────────
if [ -f /etc/dkim/private.key ]; then
  echo "[entrypoint] Starting OpenDKIM..."
  opendkim -x /etc/opendkim.conf
else
  echo "[entrypoint] Skipping OpenDKIM (no key file)."
fi

# ─── Start Postfix ──────────────────────────────────────────────────────────
echo "[entrypoint] Starting Postfix..."
postfix start

# ─── Wait for Postfix to be ready ──────────────────────────────────────────
for i in $(seq 1 10); do
  if postfix status >/dev/null 2>&1; then
    echo "[entrypoint] Postfix is ready."
    break
  fi
  echo "[entrypoint] Waiting for Postfix... (${i}/10)"
  sleep 1
done

# ─── Exec main process as 'node' user ──────────────────────────────────────
echo "[entrypoint] Starting BrightChain API server..."
exec gosu node "$@"
