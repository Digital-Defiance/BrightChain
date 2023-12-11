#!/bin/bash

# Check if a test file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <test-file-path>"
  echo "Example: $0 brightchain-lib/src/lib/guid.spec.ts"
  exit 1
fi

TEST_FILE=$1
TEST_OUTPUT_FILE="test-output.log"

echo "Running test: $TEST_FILE"
echo "Output will be saved to: $TEST_OUTPUT_FILE"

# Set NODE_ENV to test
export NODE_ENV=test

# Run the test and redirect output to a file
npx nx test brightchain-lib --testFile=$TEST_FILE > $TEST_OUTPUT_FILE 2>&1

# Check if the test passed
if [ $? -eq 0 ]; then
  echo "Test passed! See $TEST_OUTPUT_FILE for details."
  echo "Last 10 lines of output:"
  tail -n 10 $TEST_OUTPUT_FILE
  exit 0
else
  echo "Test failed! See $TEST_OUTPUT_FILE for details."
  echo "Last 10 lines of output:"
  tail -n 10 $TEST_OUTPUT_FILE
  exit 1
fi
