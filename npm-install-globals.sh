#!/bin/bash
export NPM_CONFIG_LEGACY_PEER_DEPS=true
export NPM_CONFIG_YES=true
npm install -g yarn@latest @nrwl/cli nx jest ts-node --force --yes --no-audit --no-optional --no-package-lock --no-fund "$@"
npm install -g @withgraphite/graphite-cli@stable --force --yes --no-audit --no-optional --no-package-lock --no-fund
if [ ! -z "$GRAPHITE_KEY" ]; then
  npx @withgraphite/graphite-cli@stable auth --token "${GRAPHITE_KEY}"
fi

sudo corepack enable
sudo corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate
yarn set version ${DEFAULT_YARN_VERSION}
