#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YARNRC_FILE=${SCRIPT_DIR}/.yarnrc.yml

if [ ! -f "$YARNRC_FILE" ]; then
  echo "Creating .yarnrc.yml file..."
  cat <<EOL > "$YARNRC_FILE"
nodeLinker: node-modules
nmHoistingLimits: workspaces
packageExtensions:
  vite@*:
    dependencies:
      rollup: "4.37.0"
EOL
  echo ".yarnrc.yml file created."
else
  echo ".yarnrc.yml file already exists."
fi