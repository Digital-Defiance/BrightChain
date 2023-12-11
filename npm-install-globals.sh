#!/bin/bash
export NPM_CONFIG_LEGACY_PEER_DEPS=true
export NPM_CONFIG_YES=true
yes | npm install -g yarn@latest @nrwl/cli nx jest ts-node @withgraphite/graphite-cli@stable --force --yes --no-audit --no-optional --no-package-lock --no-fund "$@"
if [ ! -z "$GRAPHITE_KEY" ]; then
  npx @withgraphite/graphite-cli@stable auth --token "${GRAPHITE_KEY}"
fi
