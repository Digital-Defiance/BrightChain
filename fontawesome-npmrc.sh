#!/bin/bash
set -e

TOKEN="${FONTAWESOME_NPM_AUTH_TOKEN:-${FONTAWESOME_KEY:-}}"
if [ -z "$TOKEN" ]; then
  echo "FONTAWESOME_NPM_AUTH_TOKEN (or FONTAWESOME_KEY) is not set; skipping .npmrc"
  exit 0
fi

cat > .npmrc << EOF
@fortawesome:registry=https://npm.fontawesome.com/
@awesome.me:registry=https://npm.fontawesome.com/
//npm.fontawesome.com/:_authToken=${TOKEN}
always-auth=true
EOF

echo "Wrote .npmrc for FontAwesome registry"
