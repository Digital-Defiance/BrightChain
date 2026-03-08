---
title: "Email Gateway — Configuration & Usage"
parent: "Messaging & Communication"
nav_order: 7
---
# Email Gateway — Configuration & Usage

This guide covers how to enable, configure, and operate the BrightChain Email Gateway. The gateway bridges BrightChain's internal gossip-based messaging with external SMTP email via Postfix.

For Postfix installation and OS-level setup, see the [Postfix Setup Guide](./email-gateway-postfix-setup.md). For the internal email system architecture, see [Email System Architecture](./email-system-architecture.md).

## Architecture Overview

The Email Gateway consists of seven components, all implemented in `brightchain-api-lib` with shared interfaces and enumerations in `brightchain-lib`.

```
┌─────────────────────────────────────────────────────────────────┐
│                    EmailGatewayService                          │
│              (orchestrator — gossip listener)                   │
├──────────────┬──────────────┬───────────────┬──────────────────┤
│ OutboundQueue│ Outbound     │ Inbound       │ Bounce           │
│ + QueueStore │ Delivery     │ Processor     │ Processor        │
│ (persistent  │ Worker       │ (fs.watch on  │ (DSN parsing,    │
│  FIFO queue) │ (serialize,  │  Mail Drop    │  VERP            │
│              │  DKIM, send) │  Directory)   │  correlation)    │
├──────────────┴──────────────┴───────────────┴──────────────────┤
│ RecipientLookupService          │ AntiSpamFilter               │
│ (TCP socketmap, port 2526)      │ (SpamAssassin / Rspamd)      │
├─────────────────────────────────┴──────────────────────────────┤
│ GatewayObservability                                           │
│ (logging, metrics, alerting)                                   │
└────────────────────────────────────────────────────────────────┘
```

### Message Flows

**Outbound** (BrightChain user → external recipient):
1. `EmailMessageService` detects external recipients (domain ≠ canonical domain)
2. Routes message via gossip to the gateway node
3. `EmailGatewayService` receives the announcement, extracts message from Block Store
4. Message is enqueued in `OutboundQueue`
5. `OutboundDeliveryWorker` serializes to RFC 5322, applies DKIM, hands to Postfix
6. Postfix handles MX resolution, TLS, and SMTP delivery

**Inbound** (external sender → BrightChain user):
1. External server connects to Postfix
2. Postfix queries `RecipientLookupService` via socketmap to validate recipient
3. Anti-spam milter scores the message
4. Postfix deposits accepted mail in the Mail Drop Directory
5. `InboundProcessor` detects the file, parses it, stores in Block Store
6. Announces to recipient via gossip

## Environment Variable Reference

All gateway configuration is read from environment variables with sensible defaults. The config loader is in `brightchain-api-lib/src/lib/services/emailGateway/emailGatewayConfig.ts`.

### Core Settings

| Variable | Default | Description |
|---|---|---|
| `EMAIL_DOMAIN` | `example.com` | Canonical email domain for this BrightChain instance. Read from `environment.emailDomain`. |

### Postfix Connection

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_POSTFIX_HOST` | `localhost` | Postfix MTA hostname |
| `GATEWAY_POSTFIX_PORT` | `25` | Postfix MTA port |
| `GATEWAY_POSTFIX_USER` | _(unset)_ | Postfix SASL username (optional) |
| `GATEWAY_POSTFIX_PASS` | _(unset)_ | Postfix SASL password (optional) |

### DKIM Signing

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_DKIM_KEY_PATH` | `/etc/dkim/private.key` | Path to the DKIM private key file |
| `GATEWAY_DKIM_SELECTOR` | `default` | DKIM selector for DNS lookup (must match the DNS TXT record) |

### Inbound Processing

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_MAIL_DROP_DIR` | `/var/spool/brightchain/incoming/` | Directory where Postfix deposits inbound mail (Maildir format) |
| `GATEWAY_ERROR_DIR` | `/var/spool/brightchain/errors/` | Directory for messages that fail inbound processing |
| `GATEWAY_MAX_MESSAGE_SIZE` | `26214400` (25 MB) | Maximum message size in bytes |

### Recipient Lookup Service

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_LOOKUP_PORT` | `2526` | TCP port for the socketmap lookup server (localhost only) |
| `GATEWAY_LOOKUP_CACHE_TTL` | `300` | Cache TTL in seconds for positive recipient lookups |

### Anti-Spam

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_SPAM_ENGINE` | `spamassassin` | Spam engine: `spamassassin` or `rspamd` |
| `GATEWAY_SPAM_PROBABLE` | `5.0` | Score threshold for probable-spam classification |
| `GATEWAY_SPAM_DEFINITE` | `10.0` | Score threshold for definite-spam classification (rejected at SMTP time) |

### Outbound Queue & Retry

| Variable | Default | Description |
|---|---|---|
| `GATEWAY_QUEUE_CONCURRENCY` | `10` | Maximum concurrent outbound SMTP connections |
| `GATEWAY_RETRY_MAX_COUNT` | `5` | Maximum delivery retry attempts before permanent failure |
| `GATEWAY_RETRY_MAX_DURATION` | `172800000` (48 hours) | Maximum total retry duration in milliseconds |
| `GATEWAY_RETRY_BASE_INTERVAL` | `60000` (60 seconds) | Base interval for exponential back-off |

## Enabling the Gateway on a BrightChain Node

### 1. Set Environment Variables

Create a `.env` file or export the variables in your process manager configuration:

```bash
# Required
export EMAIL_DOMAIN=brightchain.org
export GATEWAY_DKIM_KEY_PATH=/etc/dkim/default.private
export GATEWAY_DKIM_SELECTOR=default

# Optional — adjust as needed
export GATEWAY_POSTFIX_HOST=localhost
export GATEWAY_POSTFIX_PORT=25
export GATEWAY_MAIL_DROP_DIR=/var/spool/brightchain/incoming/
export GATEWAY_ERROR_DIR=/var/spool/brightchain/errors/
export GATEWAY_LOOKUP_PORT=2526
export GATEWAY_SPAM_ENGINE=spamassassin
```

### 2. Ensure Postfix Is Configured

Follow the [Postfix Setup Guide](./email-gateway-postfix-setup.md) to configure Postfix with:
- Socketmap recipient validation pointing to `127.0.0.1:2526`
- Mail Drop Directory transport
- DKIM and anti-spam milters

### 3. Start the Gateway

The `EmailGatewayService` is the orchestrator. In your BrightChain node bootstrap code:

```typescript
import {
  EmailGatewayService,
  OutboundQueue,
  OutboundDeliveryWorker,
  InboundProcessor,
  BounceProcessor,
  RecipientLookupService,
  AntiSpamFilter,
  GatewayObservability,
  loadGatewayConfig,
} from '@brightchain/brightchain-api-lib';

// 1. Load configuration from environment variables
const config = loadGatewayConfig();

// 2. Create the gateway service (orchestrator)
const gateway = new EmailGatewayService(
  config,
  gossipService,       // your IGossipService instance
  blockStore,          // your IBlockStore instance
  emailMessageService, // your EmailMessageService instance
);

// 3. Create and wire the outbound queue
const queueStore = new InMemoryOutboundQueueStore(); // or your persistent store
const outboundQueue = new OutboundQueue(config, queueStore);
gateway.setOutboundQueue(outboundQueue);

// 4. Create the outbound delivery worker
const deliveryWorker = new OutboundDeliveryWorker(
  outboundQueue,
  queueStore,
  config,
  postfixTransport,  // your IPostfixTransport implementation
  dkimSigner,        // your IDkimSigner implementation
);

// 5. Create the recipient lookup service
const lookupService = new RecipientLookupService(config, userRegistry);

// 6. Create the inbound processor
const inboundProcessor = new InboundProcessor(
  config,
  emailParser,         // or null to use the default EmailParser
  emailMessageService,
  blockStore,
  gossipService,
);

// 7. Create the bounce processor
const bounceProcessor = new BounceProcessor(
  config,
  emailMessageService,
  queueStore,
  gossipService,
);

// 8. Register domain-aware components for hot-reload
gateway.registerDomainAwareComponent(deliveryWorker);
gateway.registerDomainAwareComponent(lookupService);
gateway.registerDomainAwareComponent(bounceProcessor);

// 9. Start everything
gateway.start();
outboundQueue.start();
await lookupService.start();
inboundProcessor.start();
```

## Recipient Lookup Service

The `RecipientLookupService` implements the Postfix `socketmap` protocol over TCP. Postfix queries it during the SMTP `RCPT TO` phase to validate whether a recipient is a registered BrightChain user.

### How It Works

1. Postfix sends: `virtual alice@brightchain.org\n`
2. The service queries the BrightChain user registry
3. Responds with:
   - `OK alice@brightchain.org\n` — user exists, accept the message
   - `NOTFOUND \n` — user does not exist, Postfix rejects with 550
   - `TEMP registry unavailable\n` — registry unreachable, Postfix responds with 451 (retry later)

### Caching

Positive lookup results are cached in an LRU cache (max 10,000 entries) with a configurable TTL (`GATEWAY_LOOKUP_CACHE_TTL`, default 300 seconds). Negative results are not cached so that newly registered users are found promptly.

### Timeout

Each registry lookup has a 5-second timeout. If the registry does not respond in time, the service returns `TEMP` so Postfix defers the message rather than rejecting it.

### Testing the Lookup Service

From the gateway host:

```bash
# Test a known user
echo "virtual alice@brightchain.org" | nc 127.0.0.1 2526
# Expected: OK alice@brightchain.org

# Test an unknown user
echo "virtual nobody@brightchain.org" | nc 127.0.0.1 2526
# Expected: NOTFOUND
```

## Anti-Spam Filter Configuration

The `AntiSpamFilter` integrates with Postfix via the milter protocol and classifies inbound messages into three categories:

| Classification | Score Range | Action |
|---|---|---|
| Ham | score < `GATEWAY_SPAM_PROBABLE` | Accept without modification |
| Probable Spam | `GATEWAY_SPAM_PROBABLE` ≤ score < `GATEWAY_SPAM_DEFINITE` | Accept, tag with `X-Spam-Flag: YES` and `X-Spam-Score` headers |
| Definite Spam | score ≥ `GATEWAY_SPAM_DEFINITE` | Reject at SMTP time with 550 |

### Engine Selection

Set `GATEWAY_SPAM_ENGINE` to either `spamassassin` or `rspamd`.

- **SpamAssassin**: Communicates via the spamc TCP protocol (default port 783)
- **Rspamd**: Communicates via HTTP API (default port 11333)

Both engines run as separate daemons. See the [Postfix Setup Guide](./email-gateway-postfix-setup.md#7-anti-spam-integration) for installation instructions.

## Outbound Queue Tuning

### Concurrency

`GATEWAY_QUEUE_CONCURRENCY` (default: 10) controls how many outbound SMTP connections can be active simultaneously. Increase for higher throughput; decrease if your IP is being rate-limited by receiving servers.

### Retry Strategy

Failed deliveries use exponential back-off with jitter:

```
delay = GATEWAY_RETRY_BASE_INTERVAL × 2^retryCount + random(0–25% of computed delay)
```

| Retry | Approximate Delay (base = 60s) |
|---|---|
| 1 | ~2 minutes |
| 2 | ~4 minutes |
| 3 | ~8 minutes |
| 4 | ~16 minutes |
| 5 | ~32 minutes (then permanent failure) |

- **Temporary failures (4xx)**: Re-enqueued with incremented retry count
- **Permanent failures (5xx)**: Marked as permanently failed immediately, DSN sent to sender
- **Max retries exceeded**: Marked as permanently failed, DSN sent to sender

Adjust `GATEWAY_RETRY_MAX_COUNT` and `GATEWAY_RETRY_MAX_DURATION` based on your delivery requirements. The default 48-hour window with 5 retries covers most transient issues (greylisting, temporary server outages).

### Queue Persistence

The `OutboundQueue` persists messages to durable storage via the `IOutboundQueueStore` interface. On gateway restart, previously queued messages that have not exceeded the maximum retry duration are automatically resumed.

If the queue store becomes unavailable, the gateway rejects new outbound messages with a temporary failure and logs an alert.

## Bounce Processing

The `BounceProcessor` handles DSN (Delivery Status Notification) messages per RFC 3464.

### Correlation Strategy

DSN messages are correlated to original outbound messages using (in order):

1. `Original-Message-ID` or `X-Original-Message-ID` header from the DSN
2. VERP-encoded envelope sender (e.g. `bounces+msgid=domain@brightchain.org`)
3. `Message-ID` header from the returned original message headers

### Bounce Types

- **Permanent bounce** (action=failed, 5xx status): Delivery status updated to `FAILED`, bounce notification sent to original sender via gossip
- **Transient bounce** (action=delayed, 4xx status): Logged but not acted upon — the retry logic in `OutboundDeliveryWorker` handles re-delivery

## Observability and Monitoring

The `GatewayObservability` class integrates with BrightChain's existing `MessageLogger`, `MessageMetricsCollector`, and `AlertMonitor` services.

### Logged Events

**Outbound** (Requirement 10.1):
- Every delivery attempt: recipient, SMTP status code, retry count, timestamp

**Inbound** (Requirement 10.2):
- Every processed message: sender, recipient, spam score, SPF/DKIM/DMARC results, accept/reject status

### Metrics (Requirement 10.3)

The `getMetricsSnapshot()` method returns:

| Metric | Description |
|---|---|
| `outboundQueueDepth` | Current number of messages in the outbound queue |
| `deliverySuccessCount` | Total successful deliveries since last reset |
| `deliveryFailureCount` | Total failed deliveries since last reset |
| `deliverySuccessRate` | Success rate (0–1) |
| `deliveryFailureRate` | Failure rate (0–1) |
| `averageDeliveryLatencyMs` | Average delivery latency in milliseconds |
| `spamRejectionCount` | Total spam rejections since last reset |
| `spamRejectionRate` | Spam rejection rate relative to total inbound (0–1) |
| `totalInboundProcessed` | Total inbound messages processed since last reset |

### Alerts (Requirement 10.5)

When a delivery fails after all retries are exhausted, the gateway emits an alert via `AlertMonitor`. This integrates with whatever alerting infrastructure is configured for the BrightChain node (e.g. webhook, email to admin, logging).

## Dynamic Configuration Reload

The gateway supports hot-reloading the canonical domain without a restart (Requirement 8.5). When `CoreConstants.SiteEmailDomain` changes:

```typescript
gateway.updateCanonicalDomain('new-domain.org');
```

This propagates the new domain to all registered components:
- `OutboundDeliveryWorker` — updates DKIM signing domain
- `RecipientLookupService` — updates recipient validation domain, clears lookup cache
- `BounceProcessor` — updates VERP address parsing domain

## Troubleshooting

### Postfix rejects all recipients with 550

- Verify the `RecipientLookupService` is running: `nc 127.0.0.1 2526` should accept connections
- Check that `virtual_mailbox_maps` in `main.cf` points to the correct socketmap address
- Verify the user exists in the BrightChain user registry

### Messages stuck in the outbound queue

- Check `GATEWAY_POSTFIX_HOST` and `GATEWAY_POSTFIX_PORT` — can the gateway reach Postfix?
- Check Postfix logs: `sudo journalctl -u postfix -f`
- Verify DKIM key is readable: `ls -la $GATEWAY_DKIM_KEY_PATH`
- Check `GATEWAY_QUEUE_CONCURRENCY` — if set to 0, no messages will be processed

### Inbound messages not being processed

- Verify the `InboundProcessor` is running and watching the correct directory
- Check directory permissions: the BrightChain process must be able to read and delete files in `GATEWAY_MAIL_DROP_DIR`
- Check the error directory (`GATEWAY_ERROR_DIR`) for failed messages
- Look for `[InboundProcessor]` log entries for failure reasons

### DKIM verification failures on outbound mail

- Verify the DNS TXT record matches the selector: `dig TXT default._domainkey.brightchain.org`
- Ensure the private key file matches the published public key
- Check that `GATEWAY_DKIM_SELECTOR` matches the DNS record selector

### High spam rejection rate

- Review `GATEWAY_SPAM_DEFINITE` threshold — lowering it rejects more aggressively
- Check SpamAssassin/Rspamd logs for rule match details
- Consider adjusting `GATEWAY_SPAM_PROBABLE` to tag borderline messages instead of rejecting

### Bounce notifications not reaching senders

- Verify the `BounceProcessor` is processing DSN files from the Mail Drop Directory
- Check that the original outbound message exists in the metadata store (correlation requires it)
- Verify gossip connectivity between the gateway node and the sender's node

## File Reference

| File | Package | Purpose |
|---|---|---|
| `services/emailGateway/emailGatewayConfig.ts` | `brightchain-api-lib` | Configuration interface and env var loader |
| `services/emailGateway/emailGatewayService.ts` | `brightchain-api-lib` | Orchestrator — gossip listener, domain routing |
| `services/emailGateway/outboundQueue.ts` | `brightchain-api-lib` | Persistent FIFO queue with concurrency control |
| `services/emailGateway/outboundQueueStore.ts` | `brightchain-api-lib` | Queue persistence interface and in-memory impl |
| `services/emailGateway/outboundDeliveryWorker.ts` | `brightchain-api-lib` | Serialize → DKIM → Postfix delivery pipeline |
| `services/emailGateway/inboundProcessor.ts` | `brightchain-api-lib` | Mail Drop Directory watcher and parser |
| `services/emailGateway/recipientLookupService.ts` | `brightchain-api-lib` | TCP socketmap server for Postfix recipient validation |
| `services/emailGateway/antiSpamFilter.ts` | `brightchain-api-lib` | SpamAssassin/Rspamd milter adapter |
| `services/emailGateway/bounceProcessor.ts` | `brightchain-api-lib` | DSN parsing and bounce correlation |
| `services/emailGateway/gatewayObservability.ts` | `brightchain-api-lib` | Logging, metrics, and alerting integration |
| `services/emailGateway/emailAuthVerifier.ts` | `brightchain-api-lib` | SPF/DKIM/DMARC verification for inbound mail |
| `interfaces/messaging/emailGateway.ts` | `brightchain-lib` | Shared base interfaces with generic type params |
| `enumerations/messaging/outboundDeliveryStatus.ts` | `brightchain-lib` | OutboundDeliveryStatus enum |
| `enumerations/messaging/spamClassification.ts` | `brightchain-lib` | SpamClassification enum |
| `interfaces/responses/emailGatewayResponses.ts` | `brightchain-api-lib` | API response types extending Express Response |

## Related Documentation

- [Postfix Setup Guide](./email-gateway-postfix-setup.md) — OS-level Postfix installation and configuration
- [Email System Architecture](./email-system-architecture.md) — internal email system overview
- [Communication System Architecture](./communication-system-architecture.md) — direct messages, groups, channels
