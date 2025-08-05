#!/bin/bash

# Detect project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$PROJECT_ROOT"

# Find all package.json files excluding the project root's package.json
PACKAGE_ROOTS=$(find . -type f -name "package.json" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.*/*" ! -path "./package.json")

# Run yarn in the project root
echo "Running yarn \"$@\" in $PROJECT_ROOT"
yarn "$@"

# Process each package.json file in subdirectories
for PACKAGE in $PACKAGE_ROOTS; do
  PACKAGE_DIR=$(dirname "$PACKAGE")
  
  # Validate the package directory
  if [ -f "$PACKAGE_DIR/yarn.lock" ] || [ -f "$PACKAGE_DIR/package.json" ]; then
    echo "Running yarn in $PACKAGE_DIR"
    (cd "$PACKAGE_DIR" && yarn "$@")
  else
    echo "Skipping invalid package directory: $PACKAGE_DIR"
  fi
done