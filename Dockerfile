# ═══════════════════════════════════════════════════════════════════════════════
# BrightChain Node — Production Multi-Stage Build
# ═══════════════════════════════════════════════════════════════════════════════
#
# Produces a self-contained image that runs:
#   - BrightChain API server (React frontend + REST API + WebSockets)
#   - Postfix MTA (inbound email reception with DKIM)
#   - OpenDKIM milter (DKIM signing for outbound relay)
#
# Outbound email is sent via SES (EMAIL_SERVICE=SES).
# Inbound email is received by Postfix and deposited into the mail drop.
#
# Build:
#   docker build \
#     --build-arg FONTAWESOME_NPM_AUTH_TOKEN=<token> \
#     -t ghcr.io/digital-defiance/brightchain-node:latest .
#
# Run:
#   docker compose -f docker-compose.prod.yml up -d
#
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Stage 1: Builder ────────────────────────────────────────────────────────
# Full Node image with build tools. Installs deps, builds API + React.
FROM node:22-bookworm AS builder

# FontAwesome Pro kit requires authentication
ARG FONTAWESOME_NPM_AUTH_TOKEN
ENV FONTAWESOME_NPM_AUTH_TOKEN=${FONTAWESOME_NPM_AUTH_TOKEN}

WORKDIR /build

# Enable Corepack for Yarn Berry
RUN corepack enable && corepack prepare yarn@4.14.1 --activate

# Copy Yarn config and lockfile first (layer caching)
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy all workspace package.json files for workspace resolution.
# Projects without their own package.json (brightchain-api, brightchain-inituserdb,
# brightchain-react) are Nx-inferred projects that use the root package.json.
COPY brightchain-api-lib/package.json brightchain-api-lib/
COPY brightchain-azure-store/package.json brightchain-azure-store/
COPY brightchain-db/package.json brightchain-db/
COPY brightchain-lib/package.json brightchain-lib/
COPY brightchain-node-express-suite/package.json brightchain-node-express-suite/
COPY brightchain-react-components/package.json brightchain-react-components/
COPY brightchain-s3-store/package.json brightchain-s3-store/
COPY brightchain-test-utils/package.json brightchain-test-utils/
COPY brightchat-lib/package.json brightchat-lib/
COPY brightchat-react-components/package.json brightchat-react-components/
COPY brighthub-lib/package.json brighthub-lib/
COPY brighthub-react-components/package.json brighthub-react-components/
COPY brightmail-lib/package.json brightmail-lib/
COPY brightmail-react-components/package.json brightmail-react-components/
COPY brightpass-lib/package.json brightpass-lib/
COPY brightpass-react-components/package.json brightpass-react-components/
COPY digitalburnbag-api-lib/package.json digitalburnbag-api-lib/
COPY digitalburnbag-lib/package.json digitalburnbag-lib/
COPY digitalburnbag-react-components/package.json digitalburnbag-react-components/
COPY digitalburnbag-sync-client/package.json digitalburnbag-sync-client/

# Configure FontAwesome registry (replaces local verdaccio for production)
RUN yarn config set 'npmScopes["awesome.me"].npmRegistryServer' "https://npm.fontawesome.com/" && \
    yarn config set 'npmScopes["awesome.me"].npmAlwaysAuth' true && \
    yarn config set 'npmScopes["awesome.me"].npmAuthToken' "${FONTAWESOME_NPM_AUTH_TOKEN}" && \
    yarn config set nodeLinker node-modules

# Install all dependencies (including devDependencies for the build)
COPY tools/scripts tools/scripts
RUN yarn install --immutable || yarn install

# Copy full source for the build
COPY . .

# Build API (esbuild — produces dist/brightchain-api with its own package.json)
# and React frontend (vite — produces dist/brightchain-react with static files)
RUN NODE_OPTIONS='--max-old-space-size=8192' \
    NODE_ENV=production \
    npx nx run-many --target=build \
      --projects=brightchain-api,brightchain-react \
      --configuration=production \
      --parallel=2

# Install only production dependencies for the API dist.
# We copy the full node_modules from the builder (which already has everything
# installed) and let npm prune devDependencies. This avoids re-authenticating
# with private registries.
WORKDIR /build/dist/brightchain-api
RUN cp -r /build/node_modules . && \
    npm prune --omit=dev 2>/dev/null || true


# ─── Stage 2: Runtime ────────────────────────────────────────────────────────
# Lean image with only Node runtime + Postfix + OpenDKIM.
FROM node:22-bookworm-slim AS runtime

# Install Postfix, OpenDKIM, and minimal utilities
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
      postfix libsasl2-modules \
      opendkim opendkim-tools \
      netcat-openbsd gosu tini && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create the brightchain system user for mail drop ownership
RUN useradd -r -s /usr/sbin/nologin -d /var/spool/brightchain brightchain

# Create Mail Drop Directory structure (Maildir-compatible)
RUN mkdir -p /var/spool/brightchain/incoming/new \
             /var/spool/brightchain/incoming/cur \
             /var/spool/brightchain/incoming/tmp \
             /var/spool/brightchain/errors \
             /var/spool/brightchain/catchall/new \
             /var/spool/brightchain/catchall/cur \
             /var/spool/brightchain/catchall/tmp && \
    chown -R brightchain:brightchain /var/spool/brightchain && \
    chmod -R 750 /var/spool/brightchain

# Create DKIM directory (operator mounts their key here)
RUN mkdir -p /etc/dkim && \
    chown opendkim:opendkim /etc/dkim && \
    chmod 700 /etc/dkim

# Create blockstore data directory
RUN mkdir -p /data/blockstore && \
    chown node:node /data/blockstore

# Ensure OpenDKIM run directory exists
RUN mkdir -p /run/opendkim && \
    chown opendkim:opendkim /run/opendkim

# Ensure Postfix chroot dirs exist
RUN mkdir -p /var/spool/postfix/pid && \
    chown root:root /var/spool/postfix/pid

WORKDIR /app

# Copy built API with its production node_modules
COPY --from=builder /build/dist/brightchain-api ./api

# Copy built React frontend (static files)
COPY --from=builder /build/dist/brightchain-react ./react

# Copy production configs
COPY docker/postfix/main.cf /etc/postfix/main.cf
COPY docker/postfix/master.cf /etc/postfix/master.cf
COPY docker/opendkim.conf /etc/opendkim.conf
COPY docker/brightchain-maildrop /usr/local/bin/brightchain-maildrop
RUN chmod +x /usr/local/bin/brightchain-maildrop

# Copy entrypoint
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Allow node user to read mail drop (for InboundProcessor)
RUN usermod -aG brightchain node

# Environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    BRIGHTCHAIN_BLOCKSTORE_PATH=/data/blockstore \
    API_DIST_DIR=/app/api \
    REACT_DIST_DIR=/app/react \
    EMAIL_SERVICE=SES \
    GATEWAY_MAIL_DROP_DIR=/var/spool/brightchain/incoming/ \
    GATEWAY_ERROR_DIR=/var/spool/brightchain/errors/

# Ports: HTTP/WS, SMTP, Submission
EXPOSE 3000 25 587

# Persistent data
VOLUME ["/data/blockstore", "/etc/dkim"]

# Use tini for proper PID 1 signal handling
ENTRYPOINT ["tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "/app/api/main.js"]
