#!/bin/bash
# Binary search the yarn cache to find which zip causes the libzip error.
# Moves halves of the cache out and tests yarn install.
set -e

CACHE=".yarn/cache"
STASH="/tmp/yarn-bisect-stash"
rm -rf "$STASH"
mkdir -p "$STASH"

# Get all zip files
mapfile -t ALL < <(ls "$CACHE"/*.zip 2>/dev/null | sort)
echo "Total zips: ${#ALL[@]}"

test_install() {
  rm -f .yarn/install-state.gz
  yarn install 2>&1 | grep -q "ZIP_ER_INVAL"
  return $?  # 0 = error found, 1 = no error
}

# First verify the error exists
if ! test_install; then
  echo "No ZIP_ER_INVAL error found. Nothing to bisect."
  exit 0
fi

echo "Error confirmed. Starting bisect..."

# Move all zips to stash
for f in "${ALL[@]}"; do
  mv "$f" "$STASH/"
done

# Add back in batches of 100 until we find the batch with the error
batch=0
for ((i=0; i<${#ALL[@]}; i+=100)); do
  batch=$((batch+1))
  end=$((i+100))
  if [ $end -gt ${#ALL[@]} ]; then end=${#ALL[@]}; fi
  
  echo "Testing batch $batch (zips $i to $((end-1)))..."
  
  # Copy this batch back
  for ((j=i; j<end; j++)); do
    base=$(basename "${ALL[$j]}")
    cp "$STASH/$base" "$CACHE/"
  done
  
  if test_install; then
    echo ">>> Error found in batch $batch (zips $i to $((end-1)))"
    # Now bisect within this batch
    # Remove this batch
    for ((j=i; j<end; j++)); do
      base=$(basename "${ALL[$j]}")
      rm -f "$CACHE/$base"
    done
    
    # Test each file individually
    for ((j=i; j<end; j++)); do
      base=$(basename "${ALL[$j]}")
      cp "$STASH/$base" "$CACHE/"
      if test_install; then
        echo ">>> CULPRIT: $base"
        # Restore everything and exit
        for f in "$STASH"/*.zip; do
          cp "$f" "$CACHE/"
        done
        rm -rf "$STASH"
        exit 0
      fi
    done
    echo "Could not isolate single culprit in batch $batch"
  fi
done

echo "Could not find the culprit. Restoring cache..."
for f in "$STASH"/*.zip; do
  cp "$f" "$CACHE/"
done
rm -rf "$STASH"
