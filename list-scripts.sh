#!/bin/bash

# Check if jq is installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install jq to use this script."
    exit
fi

# Read and list the scripts from package.json
echo "Available scripts in package.json:"
jq -r '.scripts | to_entries[] | "\(.key): \(.value)"' package.json