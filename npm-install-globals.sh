#!/bin/bash
yes | npm install -g yarn@latest @nrwl/cli nx jest @withgraphite/graphite-cli@stable ts-node --force "$@"
if [ ! -z "$GRAPHITE_KEY" ]; then
  npx @withgraphite/graphite-cli@stable auth --token "${GRAPHITE_KEY}"
fi

sudo corepack enable
sudo corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate
yarn set version ${DEFAULT_YARN_VERSION}