#!/bin/bash
set -e

# Print debug info
echo "Container started. PID: $$"
echo "Arguments: $@"
echo "Environment:"
env | grep -E "(VSCODE|REMOTE)" || true

# Set up signal handlers for graceful shutdown
trap 'echo "Received SIGTERM, shutting down gracefully..."; exit 0' TERM
trap 'echo "Received SIGINT, shutting down gracefully..."; exit 0' INT

# Start the original command in background
if [ $# -gt 0 ]; then
    echo "Executing: $@"
    "$@" &
    CHILD_PID=$!
    echo "Child process started with PID: $CHILD_PID"
    
    # Wait for child process and handle signals
    wait $CHILD_PID
    EXIT_CODE=$?
    echo "Child process exited with code: $EXIT_CODE"
    exit $EXIT_CODE
else
    echo "No command provided, running sleep infinity"
    exec sleep infinity
fi
