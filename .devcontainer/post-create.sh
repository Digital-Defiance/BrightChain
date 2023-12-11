#!/bin/bash
set -e
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
WORKSPACE=$(realpath "${SCRIPT_DIR}/..")

echo "Post-create setup starting..."

cd ${WORKSPACE} && source .devcontainer/load-env.sh

# Basic git setup
git config --global --add safe.directory ${WORKSPACE} 2>/dev/null || true

cd ${WORKSPACE} && ./setup-nvm.sh
cd ${WORKSPACE} && ./ensure-git-globals.sh
#cd ${WORKSPACE} && ./fontawesome-npmrc.sh
cd ${WORKSPACE} && ./recover-yarn.sh

cd ${WORKSPACE} && export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && yes | corepack enable

# Setup Yarn Berry
echo "Setting up Yarn Berry..."
cd ${WORKSPACE} && corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate && corepack yarn set version ${DEFAULT_YARN_VERSION} || echo "Yarn Berry setup failed"

# Install dependencies
echo "Installing dependencies..."
cd ${WORKSPACE} && corepack yarn config set nodeLinker node-modules
cd ${WORKSPACE} && ./npm-install-globals.sh
cd ${WORKSPACE} && ./do-yarn.sh || echo "Dependency installation failed"

cd ${WORKSPACE} && /usr/local/bin/mkcert localhost brightchain.org "*.brightchain.org" brightchain.io "*.brightchain.io"

if [ -z ${AWS_ACCESS_KEY_ID} ] || [ -z ${AWS_SECRET_ACCESS_KEY} ] || [ -z ${AWS_REGION} ]; then
  echo "AWS environment variables are not set, cannot configure aws cli"
  echo "Post-create setup complete with warning"
  exit 0
fi

echo "Setting up AWS CLI from ENV"
echo "mkdir -p ~/.aws"
echo "[default]\nregion = ${AWS_REGION}\noutput = json" > ~/.aws/config
echo "[default]\naws_access_key_id = ${AWS_ACCESS_KEY_ID}\naws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}" > ~/.aws/credentials

echo ""
cd ${WORKSPACE} && yarn playwright install --with-deps || echo "Playwright installation failed"

echo "Post-create setup complete"
