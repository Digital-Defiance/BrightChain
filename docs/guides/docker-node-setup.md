---
title: "Docker Node Setup"
parent: "Guides"
nav_order: 5
permalink: /guides/docker-node-setup/
---
# Running a BrightChain Node with Docker

This guide walks you through running a production BrightChain node using Docker. The Docker image packages everything you need: the API server (serving the web UI, REST API, and WebSockets), Postfix for inbound email, and OpenDKIM for DKIM signing.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A server with a public IP and valid reverse DNS (PTR) record
- DNS control for your domain
- An AWS account with SES configured for outbound email
- A DKIM key pair for your domain

## Starting a Cluster vs. Joining One

| | Starting Your Own Cluster | Joining an Existing Cluster |
|---|---|---|
| Run `inituserdb`? | Yes — creates admin, member, and system users | No |
| Need admin/member mnemonics? | Yes — for testing/admin access | Optional — these are test/admin users for your node |
| Need system mnemonic? | Yes | Yes — every node needs a system user identity |
| Bootstrap nodes? | You ARE the bootstrap node | Point to the existing cluster's bootstrap URLs |

The **system user** is your node's identity on the network. Every node must have one, regardless of whether you're starting a new cluster or joining an existing one. The admin and member users are for local testing and administration of your node.

## Quick Start

```bash
# 1. Clone the repository (or download the release)
git clone https://github.com/Digital-Defiance/BrightChain.git
cd BrightChain

# 2. Copy the example environment file
cp .env.production.example .env

# 3. Generate your secrets
yarn new:guid      # → NODE_ID
yarn new:secret    # → JWT_SECRET
yarn new:secret    # → MNEMONIC_HMAC_SECRET
yarn new:secret    # → MNEMONIC_ENCRYPTION_KEY
yarn new:mnemonic  # → SYSTEM_MNEMONIC (required for all nodes)

# If starting your own cluster, also generate:
yarn new:mnemonic  # → ADMIN_MNEMONIC
yarn new:mnemonic  # → MEMBER_MNEMONIC

# 4. Edit .env with your values (domain, AWS credentials, secrets, passwords)

# 5. Set up DKIM
mkdir -p dkim
opendkim-genkey -s default -d your-domain.org -D dkim/
mv dkim/default.private dkim/private.key
# Publish dkim/default.txt as a DNS TXT record (see DNS Setup below)

# 6. Build and start
docker compose -f docker-compose.prod.yml up -d

# 7. Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### If Starting Your Own Cluster

After the container is running, initialize the database:

```bash
docker compose -f docker-compose.prod.yml exec brightchain-node \
  node /app/api/main.js --init-db
```

This creates the admin, member, and system user records using the mnemonics from your `.env`.

### If Joining an Existing Cluster

Just start the container. Your node will contact the bootstrap nodes, announce itself, and begin participating in the network. The system user identity is created from your `SYSTEM_MNEMONIC` on first startup. You can register additional users through the web UI or API.

## DNS Setup

Configure these DNS records for your domain before starting.

### MX Record

```
your-domain.org.    IN  MX  10  mail.your-domain.org.
```

### A Record

```
mail.your-domain.org.   IN  A  <your-server-ip>
```

### PTR Record (Reverse DNS)

Contact your hosting provider to set the PTR for your IP to `mail.your-domain.org`.

### SPF Record

```
your-domain.org.    IN  TXT  "v=spf1 mx a:mail.your-domain.org include:amazonses.com -all"
```

Note: `include:amazonses.com` is needed because outbound email goes through SES.

### DKIM DNS Record

After generating your DKIM key (step 5 above), publish the public key from `dkim/default.txt`:

```
default._domainkey.your-domain.org.  IN  TXT  "v=DKIM1; k=rsa; p=<base64-public-key>"
```

### DMARC Record

```
_dmarc.your-domain.org.  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@your-domain.org; pct=100"
```
