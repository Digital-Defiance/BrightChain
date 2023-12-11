#!/bin/bash

# Set NODE_ENV to test
export NODE_ENV=test

# Find all test files
TEST_FILES=$(find brightchain-lib/src -name "*.spec.ts")

# Create a directory for test outputs
mkdir -p test-outputs

# Initialize counters
PASSED_COUNT=0
FAILED_COUNT=0

# Run each test individually
for TEST_FILE in $TEST_FILES; do
  echo "Running test: $TEST_FILE"
  TEST_OUTPUT_FILE="test-outputs/$(basename $TEST_FILE .ts).log"
  
  # Run the test and redirect output to a file
  npx nx test brightchain-lib --testFile=$TEST_FILE > $TEST_OUTPUT_FILE 2>&1
  
  # Check if the test passed
  if [ $? -eq 0 ]; then
    echo "✅ Test passed: $TEST_FILE"
    PASSED_COUNT=$((PASSED_COUNT + 1))
  else
    echo "❌ Test failed: $TEST_FILE"
    echo "   See $TEST_OUTPUT_FILE for details"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
  
  # Add a separator
  echo "--------------------------------------"
done

# Calculate total
TOTAL_COUNT=$((PASSED_COUNT + FAILED_COUNT))

echo "Test summary:"
echo "  Passed: $PASSED_COUNT"
echo "  Failed: $FAILED_COUNT"
echo "  Total: $TOTAL_COUNT"
