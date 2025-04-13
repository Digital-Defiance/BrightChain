#!/bin/sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
elif [ -d "/usr/local/share/nvm" ]; then
  export NVM_DIR="/usr/local/share/nvm"
fi
if [ -n "$NVM_DIR" ]; then
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
  sudo chmod -R 755 "${NVM_DIR}"
fi

nvm install ${DEFAULT_NVM_VERSION} && nvm use ${DEFAULT_NVM_VERSION}