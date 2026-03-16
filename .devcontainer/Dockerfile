FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

RUN . /etc/os-release \
  && apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get clean -y && rm -rf /var/lib/apt/lists/*

RUN . /etc/os-release \
    && apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y libnss3-tools golang \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install Postfix, OpenDKIM, SpamAssassin, and SASL for the Email Gateway
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections \
    && echo "postfix postfix/mailname string brightchain.org" | debconf-set-selections \
    && apt-get install -y --no-install-recommends \
       postfix libsasl2-modules \
       opendkim opendkim-tools \
       spamassassin spamass-milter \
       netcat-openbsd \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/FiloSottile/mkcert && cd mkcert && go build -ldflags "-X main.Version=$(git describe --tags)" && cp mkcert /usr/local/bin && cd .. && rm -rf mkcert && /usr/local/bin/mkcert -install

# Install global npm packages and setup corepack
RUN npm install -g nx @angular/cli typescript ts-node nodemon && \
    corepack enable && \
    corepack prepare yarn@4.9.1 --activate

# ─── Email Gateway: Postfix & Mail Drop setup ───────────────────────────────

# Create the brightchain system user for mail drop ownership
RUN useradd -r -s /usr/sbin/nologin -d /var/spool/brightchain brightchain

# Create Mail Drop Directory structure (Maildir-compatible)
RUN mkdir -p /var/spool/brightchain/incoming/new \
             /var/spool/brightchain/incoming/cur \
             /var/spool/brightchain/incoming/tmp \
             /var/spool/brightchain/errors \
    && chown -R brightchain:brightchain /var/spool/brightchain \
    && chmod 750 /var/spool/brightchain/incoming \
    && chmod 750 /var/spool/brightchain/incoming/new \
    && chmod 750 /var/spool/brightchain/incoming/cur \
    && chmod 750 /var/spool/brightchain/incoming/tmp \
    && chmod 750 /var/spool/brightchain/errors

# Install the brightchain-maildrop pipe script
COPY brightchain-maildrop /usr/local/bin/brightchain-maildrop
RUN chmod +x /usr/local/bin/brightchain-maildrop

# Generate a dev-only DKIM key pair
RUN mkdir -p /etc/dkim \
    && opendkim-genkey -s default -d brightchain.org -D /etc/dkim \
    && mv /etc/dkim/default.private /etc/dkim/private.key \
    && chown opendkim:opendkim /etc/dkim/private.key \
    && chmod 600 /etc/dkim/private.key

# Copy Postfix configuration
COPY postfix/main.cf /etc/postfix/main.cf
COPY postfix/master.cf /etc/postfix/master.cf

# Copy OpenDKIM configuration
COPY opendkim.conf /etc/opendkim.conf

# Ensure Postfix chroot dirs exist and fix permissions
RUN mkdir -p /var/spool/postfix/pid \
    && chown root:root /var/spool/postfix/pid

# Copy and set up custom entrypoint for better signal handling
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]