#!/bin/bash
if [ -z "${GIT_EMAIL}" ]; then
  echo "GIT_EMAIL is not set. Please set it to your email address."
  exit 1
fi
if [ -z "${GIT_NAME}" ]; then
  echo "GIT_NAME is not set. Please set it to your name."
  exit 1
fi

# Check if user.email is already set
CURRENT_EMAIL=$(git config --global --get user.email || echo "")
# Check if user.name is already set
CURRENT_NAME=$(git config --global --get user.name || echo "")

# Set user.email if it's not set or different from GIT_EMAIL
if [ -z "${CURRENT_EMAIL}" ] || [ "${CURRENT_EMAIL}" != "${GIT_EMAIL}" ]; then
  echo "Setting git global user.email to ${GIT_EMAIL}"
  git config --global user.email "${GIT_EMAIL}"
else
  echo "Git global user.email already set to ${CURRENT_EMAIL}"
fi

# Set user.name if it's not set or different from GIT_NAME
if [ -z "${CURRENT_NAME}" ] || [ "${CURRENT_NAME}" != "${GIT_NAME}" ]; then
  echo "Setting git global user.name to ${GIT_NAME}"
  git config --global user.name "${GIT_NAME}"
else
  echo "Git global user.name already set to ${CURRENT_NAME}"
fi