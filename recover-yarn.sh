#!/bin/bash
set -e

NEED_SUDO=0
if [ "${USER}" != "root" ]; then
  NEED_SUDO=1
fi
echo "Clearing .yarnrc, .yarnrc.yml, and .yarn"
rm -rf .yarnrc .yarnrc.yml .yarn

echo "Enabling corepack"
if [ $NEED_SUDO -eq 1 ]; then
  sudo corepack enable
  sudo corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate
else
  corepack enable
  corepack prepare yarn@${DEFAULT_YARN_VERSION} --activate
fi

DEFAULT_YARN_VERSION=${DEFAULT_YARN_VERSION:-berry}

echo "Setting yarn version to ${DEFAULT_YARN_VERSION}"
yarn set version ${DEFAULT_YARN_VERSION}