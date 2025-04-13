#!/bin/bash
set -e

# Ensure NVM is loaded and the correct Node version is active
if [ -s "/usr/local/share/nvm/nvm.sh" ]; then
  echo "=== DEBUG: Sourcing NVM from /usr/local/share/nvm/nvm.sh"
  . /usr/local/share/nvm/nvm.sh
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "=== DEBUG: Sourcing NVM from $HOME/.nvm/nvm.sh"
  . "$HOME/.nvm/nvm.sh"
fi
# Only run nvm use if .nvmrc exists, otherwise skip and continue
if [ -f ".nvmrc" ]; then
  nvm use
fi

# Set the desired Yarn version (default to 4.9.1 if not set)
DEFAULT_YARN_VERSION=${DEFAULT_YARN_VERSION:-4.9.1}

echo "Clearing .yarnrc, .yarnrc.yml, and .yarn"
rm -rf .yarnrc .yarnrc.yml .yarn

echo "Enabling corepack"
corepack enable

echo "Preparing yarn@${DEFAULT_YARN_VERSION} for immediate activation..."
corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate

echo "Setting yarn version to ${DEFAULT_YARN_VERSION}"
corepack yarn set version ${DEFAULT_YARN_VERSION}

echo "Yarn version after setup:"
corepack yarn --version

echo "=== DEBUG: which yarn: $(which yarn)"
echo "=== DEBUG: yarn --version: $(yarn --version)"
echo "=== DEBUG: corepack yarn version: $(corepack yarn --version 2>&1 || echo 'corepack yarn not available')"
