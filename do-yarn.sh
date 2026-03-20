#!/bin/bash

# Parse --max-depth option
MAX_DEPTH=""
YARN_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-depth)
      MAX_DEPTH="$2"
      shift 2
      ;;
    *)
      YARN_ARGS+=("$1")
      shift
      ;;
  esac
done

# Detect project root
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$PROJECT_ROOT"

# Build ignore patterns from .doyarnignore
IGNORE_ARGS=()
if [ -f "$PROJECT_ROOT/.doyarnignore" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="$(echo "$line" | sed 's/#.*//;s/^[[:space:]]*//;s/[[:space:]]*$//')"
    [ -z "$line" ] && continue
    IGNORE_ARGS+=(! -path "*/${line}/*")
  done < "$PROJECT_ROOT/.doyarnignore"
fi

# Find all package.json files excluding the project root's package.json
FIND_ARGS=(. ${MAX_DEPTH:+-maxdepth "$MAX_DEPTH"} -type f -name "package.json" ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.*/*" ! -path "./package.json" "${IGNORE_ARGS[@]}")
PACKAGE_ROOTS=$(find "${FIND_ARGS[@]}")

# Run yarn in the project root
echo "Running yarn \"${YARN_ARGS[*]}\" in $PROJECT_ROOT"
yarn "${YARN_ARGS[@]}"

# Process each package.json file in subdirectories
for PACKAGE in $PACKAGE_ROOTS; do
  PACKAGE_DIR=$(dirname "$PACKAGE")
  
  # Validate the package directory
  if [ -f "$PACKAGE_DIR/yarn.lock" ] || [ -f "$PACKAGE_DIR/package.json" ]; then
    echo "Running yarn in $PACKAGE_DIR"
    (cd "$PACKAGE_DIR" && yarn "${YARN_ARGS[@]}")
  else
    echo "Skipping invalid package directory: $PACKAGE_DIR"
  fi
done