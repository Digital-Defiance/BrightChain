FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

RUN . /etc/os-release \
  && apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get clean -y && rm -rf /var/lib/apt/lists/*

RUN . /etc/os-release \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y libnss3-tools golang \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"

RUN git clone https://github.com/FiloSottile/mkcert && cd mkcert && go build -ldflags "-X main.Version=$(git describe --tags)" && cp mkcert /usr/local/bin && cd .. && rm -rf mkcert && /usr/local/bin/mkcert -install

# Install global npm packages and setup corepack
RUN npm install -g nx @angular/cli typescript ts-node nodemon && \
    corepack enable && \
    corepack prepare yarn@4.9.1 --activate

# Copy and set up custom entrypoint for better signal handling
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]