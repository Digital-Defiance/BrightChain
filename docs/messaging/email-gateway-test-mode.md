---
title: "Email Gateway — Test Mode"
parent: "Messaging & Communication"
nav_order: 8
---
# Email Gateway — Test Mode

This guide covers how to use the BrightChain Email Gateway in test mode for local development and CI environments. Test mode allows you to develop and test email functionality without real DNS records, MX lookups, or external SMTP connectivity.

## Overview

Test mode provides a localhost-only email sandbox with these features:

- **Catchall transport** — Outbound mail is captured to the filesystem instead of SMTP delivery
- **Skip DKIM** — No real DKIM key required; signing can be skipped or faked
- **Skip spam filtering** — No SpamAssassin/Rspamd required
- **Accept all recipients** — No user registry lookup required
- **Multiple domain support** — Accepts mail for `@brightchain.org`, `@brightchain.local`, and `@localhost`

## Quick Start (Devcontainer)

The devcontainer is pre-configured for test mode. After starting the container:

```bash
# Check gateway status
test-email status

# Send a test email
test-email send alice@brightchain.local

# List received mail
test-email list

# Read a specific email
test-email read <filename>

# Watch for new mail
test-email watch
```

## Environment Variables

Enable test mode by setting these environment variables in `.devcontainer/.env`:

```bash
# Enable test mode
GATEWAY_TEST_MODE=true

# Capture outbound mail to filesystem
GATEWAY_TEST_CATCHALL=true
GATEWAY_TEST_CATCHALL_DIR=/var/spool/brightchain/catchall/

# Skip DKIM signing
GATEWAY_TEST_SKIP_DKIM=true

# Skip spam filtering
GATEWAY_TEST_SKIP_SPAM=true

# Accept all recipients without lookup
GATEWAY_TEST_ACCEPT_ALL_RECIPIENTS=true

# Optional: specific test recipients always accepted
# GATEWAY_TEST_RECIPIENTS=alice@brightchain.org,bob@brightchain.org
```

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_TEST_MODE` | `false` | Enable test mode |
| `GATEWAY_TEST_CATCHALL` | `false` | Capture outbound mail to filesystem |
| `GATEWAY_TEST_CATCHALL_DIR` | `/var/spool/brightchain/catchall/` | Catchall directory (Maildir format) |
| `GATEWAY_TEST_SKIP_DKIM` | `false` | Skip DKIM signing |
| `GATEWAY_TEST_SKIP_SPAM` | `false` | Skip spam filtering |
| `GATEWAY_TEST_ACCEPT_ALL_RECIPIENTS` | `false` | Accept all recipients |
| `GATEWAY_TEST_RECIPIENTS` | `""` | Comma-separated list of always-accepted recipients |

## Directory Structure

In test mode, mail is stored in these directories:

```
/var/spool/brightchain/
├── incoming/           # Inbound mail from Postfix
│   ├── new/           # Unprocessed messages
│   ├── cur/           # Processed messages
│   └── tmp/           # Temporary storage during delivery
├── catchall/          # Captured outbound mail (test mode only)
│   ├── new/           # Captured messages
│   ├── cur/           # Read messages
│   └── tmp/           # Temporary storage
└── errors/            # Failed messages
```

## Programmatic Usage

### TypeScript/Node.js

```typescript
import {
  loadGatewayConfig,
  createTestModeConfig,
  CatchallTransport,
  NoOpDkimSigner,
  OutboundDeliveryWorker,
} from '@brightchain/brightchain-api-lib';

// Option 1: Load config from environment (respects GATEWAY_TEST_* vars)
const config = loadGatewayConfig();

// Option 2: Create a test mode config programmatically
const testConfig = createTestModeConfig({
  canonicalDomain: 'test.local',
});

// Create test mode transports
const transport = new CatchallTransport(testConfig);
const dkimSigner = new NoOpDkimSigner();

// Use in OutboundDeliveryWorker
const worker = new OutboundDeliveryWorker(
  outboundQueue,
  queueStore,
  testConfig,
  transport,
  dkimSigner,
);

// After sending, inspect captured emails
const captured = transport.getCapturedEmails();
console.log(`Captured ${captured.length} emails`);

// Get the last captured email
const lastEmail = transport.getLastCaptured();
if (lastEmail) {
  console.log(`To: ${lastEmail.to.join(', ')}`);
  console.log(`From: ${lastEmail.from}`);
}

// Clear captured emails (for test cleanup)
transport.clearCaptured();
```

### Jest Tests

```typescript
import {
  createTestModeConfig,
  CatchallTransport,
  NoOpDkimSigner,
} from '@brightchain/brightchain-api-lib';

describe('Email sending', () => {
  let transport: CatchallTransport;
  let config: IEmailGatewayConfig;

  beforeEach(() => {
    config = createTestModeConfig();
    transport = new CatchallTransport(config);
  });

  afterEach(() => {
    transport.clearCaptured();
  });

  it('should capture outbound email', async () => {
    const result = await transport.send(
      'sender@test.local',
      ['recipient@test.local'],
      new TextEncoder().encode('From: sender@test.local\r\nTo: recipient@test.local\r\n\r\nTest body'),
    );

    expect(result.success).toBe(true);
    expect(result.responseCode).toBe(250);

    const captured = transport.getCapturedEmails();
    expect(captured).toHaveLength(1);
    expect(captured[0].to).toContain('recipient@test.local');
  });
});
```

## Sending Test Emails

### Using sendmail

```bash
# Simple test
echo "Test body" | sendmail -f test@localhost alice@brightchain.local

# With headers
sendmail -f test@localhost alice@brightchain.local <<EOF
From: Test Sender <test@localhost>
To: alice@brightchain.local
Subject: Test Email
Content-Type: text/plain; charset=utf-8

This is a test email body.
EOF
```

### Using swaks (if installed)

```bash
# Install swaks
apt-get install swaks

# Send test email
swaks --to alice@brightchain.local \
      --from test@localhost \
      --server localhost \
      --header "Subject: Test via swaks"
```

### Using netcat (raw SMTP)

```bash
nc localhost 25 <<EOF
HELO localhost
MAIL FROM:<test@localhost>
RCPT TO:<alice@brightchain.local>
DATA
From: test@localhost
To: alice@brightchain.local
Subject: Test via netcat

Test body
.
QUIT
EOF
```

## Inspecting Captured Mail

### Command Line

```bash
# List all captured mail
ls -la /var/spool/brightchain/catchall/new/

# Read a message
cat /var/spool/brightchain/catchall/new/<filename>

# Read metadata sidecar
cat /var/spool/brightchain/catchall/new/<filename>.meta.json
```

### Metadata Sidecar Files

Each captured message has a `.meta.json` sidecar file containing:

```json
{
  "from": "sender@test.local",
  "to": ["recipient@test.local"],
  "capturedAt": "2024-01-15T10:30:00.000Z",
  "sizeBytes": 1234
}
```

## Postfix Test Mode Configuration

The devcontainer's Postfix is configured for test mode:

- Accepts mail for multiple domains: `brightchain.org`, `brightchain.local`, `localhost`
- No TLS required
- No authentication required from localhost
- All mail delivered to the Mail Drop Directory
- DKIM milter disabled by default

See `.devcontainer/postfix/main.cf` for the full configuration.

## Troubleshooting

### Postfix not starting

```bash
# Check status
postfix status

# Check configuration
postfix check

# View logs
tail -f /var/log/mail.log
```

### Mail not being delivered

```bash
# Check mail queue
mailq

# Flush queue
postfix flush

# Check recipient lookup service
echo "virtual alice@brightchain.local" | nc 127.0.0.1 2526
```

### Permission errors

```bash
# Fix mail directory permissions
sudo chown -R brightchain:brightchain /var/spool/brightchain
sudo chmod -R g+rwx /var/spool/brightchain
```

## CI Integration

For CI environments, use environment variables to enable test mode:

```yaml
# GitHub Actions example
env:
  GATEWAY_TEST_MODE: "true"
  GATEWAY_TEST_CATCHALL: "true"
  GATEWAY_TEST_SKIP_DKIM: "true"
  GATEWAY_TEST_SKIP_SPAM: "true"
  GATEWAY_TEST_ACCEPT_ALL_RECIPIENTS: "true"
```

Or use the programmatic API:

```typescript
// In test setup
const config = createTestModeConfig();
```

## Related Documentation

- [Email Gateway Configuration](./email-gateway-configuration) — Production configuration
- [Postfix Setup Guide](./email-gateway-postfix-setup) — Production Postfix setup
- [Email System Architecture](./email-system-architecture) — Internal email system overview
