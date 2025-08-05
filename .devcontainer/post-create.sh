#!/bin/bash
set -e
WORKSPACE=/workspaces/BrightChain

echo "Post-create setup starting..."

# Basic git setup
git config --global --add safe.directory ${WORKSPACE} 2>/dev/null || true

cd ${WORKSPACE} && ./setup-nvm.sh
cd ${WORKSPACE} && ./ensure-git-globals.sh
#cd ${WORKSPACE} && ./fontawesome-npmrc.sh
cd ${WORKSPACE} && ./recover-yarn.sh

cd ${WORKSPACE} && export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && yes | corepack enable

# Setup Yarn Berry
echo "Setting up Yarn Berry..."
cd ${WORKSPACE} && yarn set version berry || echo "Yarn Berry setup failed"

# Install dependencies
echo "Installing dependencies..."
cd ${WORKSPACE} && yarn config set nodeLinker node-modules
cd ${WORKSPACE} && ./do-yarn.sh || echo "Dependency installation failed"

cd ${WORKSPACE} && /usr/local/bin/mkcert localhost brightchain.org brightchain.io "*.brightchain.org" "*.brightchain.io"

echo "Post-create setup complete"