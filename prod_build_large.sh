#!/bin/bash

# Configuration
SWAP_PATH="/mnt/temp_swapfile"
SWAP_SIZE="10G"
BUILD_COMMAND='NODE_OPTIONS="--max-old-space-size=16384" yarn build:all:prod'

# Function to remove swap safely
cleanup() {
    echo "----------------------------------------"
    if swapon --show | grep -q "$SWAP_PATH"; then
        echo "Deactivating swap..."
        sudo swapoff "$SWAP_PATH"
    fi
    if [ -f "$SWAP_PATH" ]; then
        echo "Removing swap file..."
        sudo rm -f "$SWAP_PATH"
    fi
    echo "Cleanup complete."
}

# Trap signals for cleanup (Success, Error, or Ctrl+C)
trap cleanup EXIT INT TERM

echo "Creating ${SWAP_SIZE} swap file at ${SWAP_PATH}..."

# Allocate the file
if ! sudo fallocate -l "$SWAP_SIZE" "$SWAP_PATH"; then
    echo "fallocate failed, falling back to dd (this may take a minute)..."
    sudo dd if=/dev/zero of="$SWAP_PATH" bs=1M count=10240
fi

# Set permissions and initialize
sudo chmod 600 "$SWAP_PATH"
sudo mkswap "$SWAP_PATH"
sudo swapon "$SWAP_PATH"

echo "Swap active. Total memory available:"
free -h

echo "----------------------------------------"
echo "Starting build process..."

# Execute the build
# We use eval so you can pass complex strings if needed
eval "$BUILD_COMMAND"

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "Build succeeded!"
else
    echo "Build failed with exit code $BUILD_EXIT_CODE."
fi

# Cleanup function is triggered automatically here by the trap
