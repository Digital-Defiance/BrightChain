---
title: "Email Gateway — Postfix Setup"
parent: "Messaging & Communication"
nav_order: 6
---
# Email Gateway — Postfix Setup

This guide covers how to install and configure Postfix as the MTA for a BrightChain Email Gateway node. It applies to both **primary** (outbound + inbound) and **secondary/relay** (inbound-only or relay) node roles.

## Prerequisites

- A Linux server (Debian/Ubuntu or RHEL/CentOS) with root access
- A public IP address with a valid reverse DNS (PTR) record matching your mail hostname
- DNS control for your BrightChain domain (e.g. `brightchain.org`)
- BrightChain node software installed and running
- Node.js 18+ (for the gateway services)

## 1. Install Postfix

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install postfix libsasl2-modules
```

Select **Internet Site** when prompted. Set the system mail name to your BrightChain domain (e.g. `brightchain.org`).

### RHEL / CentOS

```bash
sudo dnf install postfix cyrus-sasl-plain
sudo systemctl enable postfix
```

## 2. DNS Records

Before configuring Postfix, set up the required DNS records for your domain.

### MX Record

Point your domain's MX record to the gateway host:

```
brightchain.org.    IN  MX  10  mail.brightchain.org.
```

For secondary nodes, add additional MX records with higher priority values:

```
brightchain.org.    IN  MX  10  mail1.brightchain.org.
brightchain.org.    IN  MX  20  mail2.brightchain.org.
```

### A / AAAA Records

```
mail.brightchain.org.   IN  A       203.0.113.10
mail.brightchain.org.   IN  AAAA    2001:db8::10
```

### PTR Record (Reverse DNS)

Contact your hosting provider to set the PTR record for your IP to match the mail hostname:

```
10.113.0.203.in-addr.arpa.  IN  PTR  mail.brightchain.org.
```

### SPF Record

Authorize your gateway server(s) to send email for the domain:

```
brightchain.org.    IN  TXT  "v=spf1 mx a:mail.brightchain.org -all"
```

For multiple gateway nodes:

```
brightchain.org.    IN  TXT  "v=spf1 mx a:mail1.brightchain.org a:mail2.brightchain.org -all"
```

### DMARC Record

Publish a DMARC policy. Start with `p=none` for monitoring, then tighten to `p=quarantine` or `p=reject`:

```
_dmarc.brightchain.org.  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@brightchain.org; pct=100"
```

### DKIM DNS Record

After generating your DKIM key (see section 6), publish the public key:

```
default._domainkey.brightchain.org.  IN  TXT  "v=DKIM1; k=rsa; p=<base64-public-key>"
```

The selector (`default` above) must match `GATEWAY_DKIM_SELECTOR`.

## 3. Primary Node Configuration

A primary node handles both outbound delivery and inbound reception.

### /etc/postfix/main.cf

```ini
# Basic identity
myhostname = mail.brightchain.org
mydomain = brightchain.org
myorigin = $mydomain
mydestination =

# Network settings
inet_interfaces = all
inet_protocols = all

# Relay and transport
relayhost =
mynetworks = 127.0.0.0/8 [::1]/128

# Recipient validation via BrightChain Recipient Lookup Service (socketmap)
# The gateway's RecipientLookupService listens on TCP port 2526.
virtual_mailbox_domains = brightchain.org
virtual_mailbox_maps = socketmap:inet:127.0.0.1:2526:virtual

# Inbound mail delivery — deposit into Mail Drop Directory
virtual_transport = brightchain-drop
mailbox_size_limit = 26214400

# TLS — inbound (opportunistic)
smtpd_tls_cert_file = /etc/ssl/certs/mail.brightchain.org.pem
smtpd_tls_key_file = /etc/ssl/private/mail.brightchain.org.key
smtpd_tls_security_level = may
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_ciphers = high
smtpd_tls_mandatory_ciphers = high

# TLS — outbound (opportunistic, prefer encryption)
smtp_tls_security_level = may
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_ciphers = high
smtp_tls_loglevel = 1

# Message size limit (matches GATEWAY_MAX_MESSAGE_SIZE, default 25 MB)
message_size_limit = 26214400

# Milter integration for anti-spam (SpamAssassin or Rspamd)
# Uncomment the appropriate line based on your spam engine.
# SpamAssassin (via spamass-milter):
# smtpd_milters = unix:/run/spamass-milter/spamass-milter.sock
# Rspamd:
# smtpd_milters = inet:127.0.0.1:11332
# non_smtpd_milters = $smtpd_milters
# milter_default_action = accept

# DKIM signing via OpenDKIM milter
# smtpd_milters = inet:127.0.0.1:8891
# non_smtpd_milters = inet:127.0.0.1:8891
# milter_protocol = 6
# milter_default_action = accept
```

### /etc/postfix/master.cf

Add the `brightchain-drop` transport that deposits mail into the Mail Drop Directory:

```ini
# ==========================================================================
# service  type  private unpriv  chroot  wakeup  maxproc command + args
# ==========================================================================

# Standard SMTP listener
smtp       inet  n       -       y       -       -       smtpd

# Submission port (587) for authenticated outbound from BrightChain
submission inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject

# BrightChain Mail Drop transport
# Deposits accepted inbound mail into the Mail Drop Directory as individual files.
brightchain-drop  unix  -  n  n  -  -  pipe
  flags=DRhu user=brightchain
  argv=/usr/local/bin/brightchain-maildrop ${sender} ${recipient}
```

The `brightchain-maildrop` script is a simple shell wrapper that writes stdin to a unique file in the Mail Drop Directory:

```bash
#!/bin/bash
# /usr/local/bin/brightchain-maildrop
# Deposits a message into the BrightChain Mail Drop Directory.
MAIL_DROP_DIR="/var/spool/brightchain/incoming"
FILENAME="$(date +%s).$(hostname).$$.$RANDOM"
cat > "${MAIL_DROP_DIR}/tmp/${FILENAME}"
mv "${MAIL_DROP_DIR}/tmp/${FILENAME}" "${MAIL_DROP_DIR}/new/${FILENAME}"
exit 0
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/brightchain-maildrop
```

## 4. Secondary / Relay Node Configuration

A secondary node accepts inbound mail and relays it to the primary, or acts as a backup MX. It does not run the full outbound delivery pipeline.

### /etc/postfix/main.cf (secondary)

```ini
myhostname = mail2.brightchain.org
mydomain = brightchain.org
myorigin = $mydomain
mydestination =

inet_interfaces = all
inet_protocols = all

# Relay to the primary node
relayhost = [mail.brightchain.org]:25
relay_domains = brightchain.org

# Recipient validation — same socketmap lookup against the local
# BrightChain node's RecipientLookupService
virtual_mailbox_domains = brightchain.org
virtual_mailbox_maps = socketmap:inet:127.0.0.1:2526:virtual

# TLS (same settings as primary)
smtpd_tls_cert_file = /etc/ssl/certs/mail2.brightchain.org.pem
smtpd_tls_key_file = /etc/ssl/private/mail2.brightchain.org.key
smtpd_tls_security_level = may
smtp_tls_security_level = may

message_size_limit = 26214400
```

The secondary node still runs the `RecipientLookupService` locally so it can reject unknown recipients at SMTP time. The BrightChain user registry is replicated across nodes via the gossip protocol.

## 5. Mail Drop Directory Setup

Create the Maildir-compatible directory structure and set permissions:

```bash
# Create directories
sudo mkdir -p /var/spool/brightchain/incoming/new
sudo mkdir -p /var/spool/brightchain/incoming/cur
sudo mkdir -p /var/spool/brightchain/incoming/tmp
sudo mkdir -p /var/spool/brightchain/errors

# Create the brightchain system user (if not already present)
sudo useradd -r -s /usr/sbin/nologin -d /var/spool/brightchain brightchain

# Set ownership and permissions
sudo chown -R brightchain:brightchain /var/spool/brightchain
sudo chmod 750 /var/spool/brightchain/incoming
sudo chmod 750 /var/spool/brightchain/incoming/new
sudo chmod 750 /var/spool/brightchain/incoming/cur
sudo chmod 750 /var/spool/brightchain/incoming/tmp
sudo chmod 750 /var/spool/brightchain/errors
```

The `InboundProcessor` watches `/var/spool/brightchain/incoming/` (configurable via `GATEWAY_MAIL_DROP_DIR`). Failed messages are moved to `/var/spool/brightchain/errors/` (configurable via `GATEWAY_ERROR_DIR`).

## 6. DKIM Signing Setup (OpenDKIM)

### Install OpenDKIM

```bash
# Debian/Ubuntu
sudo apt install opendkim opendkim-tools

# RHEL/CentOS
sudo dnf install opendkim opendkim-tools
```

### Generate DKIM Key Pair

```bash
sudo mkdir -p /etc/dkim
sudo opendkim-genkey -s default -d brightchain.org -D /etc/dkim
sudo chown opendkim:opendkim /etc/dkim/default.private
sudo chmod 600 /etc/dkim/default.private
```

This creates:
- `/etc/dkim/default.private` — the private key (set `GATEWAY_DKIM_KEY_PATH` to this path)
- `/etc/dkim/default.txt` — the DNS TXT record to publish

### Configure OpenDKIM

**/etc/opendkim.conf:**

```ini
Syslog          yes
UMask           007
Socket          inet:8891@127.0.0.1
PidFile         /run/opendkim/opendkim.pid
OversignHeaders From
TrustAnchorFile /usr/share/dns/root.key

Domain          brightchain.org
KeyFile         /etc/dkim/default.private
Selector        default

Canonicalization relaxed/simple
Mode            sv
SubDomains      no
```

### Enable and Start

```bash
sudo systemctl enable opendkim
sudo systemctl start opendkim
```

Then uncomment the DKIM milter lines in `/etc/postfix/main.cf`:

```ini
smtpd_milters = inet:127.0.0.1:8891
non_smtpd_milters = inet:127.0.0.1:8891
milter_protocol = 6
milter_default_action = accept
```

Reload Postfix:

```bash
sudo systemctl reload postfix
```

## 7. Anti-Spam Integration

BrightChain's `AntiSpamFilter` integrates with Postfix via the milter protocol. Choose one engine.

### Option A: SpamAssassin

```bash
# Install
sudo apt install spamassassin spamass-milter

# Enable and start
# Note: On Ubuntu 24.04+, the service is named "spamd", not "spamassassin".
sudo systemctl enable spamd
sudo systemctl start spamd
sudo systemctl enable spamass-milter
sudo systemctl start spamass-milter
```

Add to `/etc/postfix/main.cf`:

```ini
smtpd_milters = unix:/run/spamass-milter/spamass-milter.sock, inet:127.0.0.1:8891
milter_default_action = accept
```

Set the environment variable:

```bash
export GATEWAY_SPAM_ENGINE=spamassassin
```

### Option B: Rspamd

```bash
# Install (Debian/Ubuntu — add the Rspamd repository first)
sudo apt install rspamd

# Enable and start
sudo systemctl enable rspamd
sudo systemctl start rspamd
```

Add to `/etc/postfix/main.cf`:

```ini
smtpd_milters = inet:127.0.0.1:11332, inet:127.0.0.1:8891
milter_default_action = accept
```

Set the environment variable:

```bash
export GATEWAY_SPAM_ENGINE=rspamd
```

### Spam Thresholds

Configure the classification thresholds via environment variables:

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_SPAM_PROBABLE` | `5.0` | Score at or above which a message is classified as probable spam (tagged, delivered to spam folder) |
| `GATEWAY_SPAM_DEFINITE` | `10.0` | Score at or above which a message is classified as definite spam (rejected at SMTP time with 550) |

## 8. TLS Certificate Setup

Use Let's Encrypt (certbot) for free TLS certificates:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d mail.brightchain.org
```

Then point Postfix to the certificates in `main.cf`:

```ini
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.brightchain.org/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.brightchain.org/privkey.pem
```

Set up auto-renewal:

```bash
sudo systemctl enable certbot.timer
```

## 9. Firewall / Port Requirements

Open the following ports on your gateway node:

| Port | Protocol | Direction | Purpose |
|---|---|---|---|
| 25 | TCP | Inbound | SMTP — receiving mail from external servers |
| 25 | TCP | Outbound | SMTP — delivering mail to external servers |
| 587 | TCP | Inbound | Submission — authenticated outbound from BrightChain nodes |
| 443 | TCP | Outbound | HTTPS — Let's Encrypt certificate renewal, Rspamd updates |
| 2526 | TCP | Localhost only | Recipient Lookup Service (socketmap) — Postfix ↔ BrightChain |
| 783 | TCP | Localhost only | SpamAssassin spamd (if using SpamAssassin) |
| 11332 | TCP | Localhost only | Rspamd milter proxy (if using Rspamd) |
| 11333 | TCP | Localhost only | Rspamd HTTP API (if using Rspamd) |
| 8891 | TCP | Localhost only | OpenDKIM milter |

Example with `ufw`:

```bash
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
sudo ufw allow 443/tcp
```

Ports 2526, 783, 11332, 11333, and 8891 should remain bound to `127.0.0.1` and do not need firewall rules.

## 10. Applying Configuration

After making changes, validate and reload:

```bash
# Check Postfix configuration for errors
sudo postfix check

# Reload Postfix
sudo systemctl reload postfix

# Verify Postfix is listening
sudo ss -tlnp | grep -E ':(25|587)\s'

# Test recipient lookup (from the gateway host)
echo "virtual alice@brightchain.org" | nc 127.0.0.1 2526
# Expected: OK alice@brightchain.org  (if user exists)
# Expected: NOTFOUND                  (if user does not exist)
```

## Related Documentation

- [Test Mode Guide](./email-gateway-test-mode.md) — Local development and testing setup
- [Email Gateway Configuration Guide](./email-gateway-configuration.md) — environment variables, enabling the gateway, tuning, and troubleshooting
- [Email System Architecture](./email-system-architecture.md) — internal email system overview
